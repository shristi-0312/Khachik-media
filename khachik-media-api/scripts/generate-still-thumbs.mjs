#!/usr/bin/env node
/**
 * Backfill globe tiles for existing stills:
 * media/stills/{id}.jpg → media/stills/thumbs/{id}.jpg (~720px JPEG)
 *
 * Usage (from repo root or api folder, with infra/.env loaded):
 *   node scripts/generate-still-thumbs.mjs
 *   node scripts/generate-still-thumbs.mjs --limit 20
 */
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const envPaths = [
  path.join(root, 'infra/.env'),
  path.join(here, '../.env'),
]

for (const p of envPaths) {
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m || process.env[m[1]]) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const BUCKET = process.env.S3_BUCKET
const REGION = process.env.AWS_REGION || 'ap-south-1'
if (!BUCKET) {
  console.error('S3_BUCKET missing')
  process.exit(1)
}

const limitArg = process.argv.find((a) => a.startsWith('--limit'))
const LIMIT = limitArg
  ? Number(limitArg.includes('=') ? limitArg.split('=')[1] : process.argv[process.argv.indexOf(limitArg) + 1])
  : Infinity

const client = new S3Client({
  region: REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
})

const PREFIX = 'media/stills/'
const CACHE = 'public, max-age=31536000, immutable'

async function listKeys() {
  const keys = []
  let token
  do {
    const out = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: token,
      }),
    )
    for (const obj of out.Contents ?? []) {
      const key = obj.Key
      if (!key || key.endsWith('/')) continue
      if (key.includes('/thumbs/')) continue
      if (!/\.(jpe?g|png|webp)$/i.test(key)) continue
      keys.push(key)
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined
  } while (token)
  return keys
}

async function bodyToBuffer(body) {
  const chunks = []
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function main() {
  const keys = await listKeys()
  console.log(`Found ${keys.length} stills in s3://${BUCKET}/${PREFIX}`)
  let done = 0
  let skipped = 0
  for (const key of keys) {
    if (done >= LIMIT) break
    const base = path.basename(key).replace(/\.[^.]+$/, '.jpg')
    const thumbKey = `${PREFIX}thumbs/${base}`

    try {
      await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: thumbKey }))
      skipped += 1
      continue
    } catch {
      /* missing — generate */
    }

    const got = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const buf = await bodyToBuffer(got.Body)
    const thumb = await sharp(buf)
      .rotate()
      .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer()

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbKey,
        Body: thumb,
        ContentType: 'image/jpeg',
        CacheControl: CACHE,
      }),
    )
    done += 1
    console.log(`✓ ${thumbKey} (${Math.round(thumb.length / 1024)}KB) from ${key}`)
  }
  console.log(`Done. created=${done} already_present=${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
