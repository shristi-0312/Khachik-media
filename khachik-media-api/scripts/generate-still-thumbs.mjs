#!/usr/bin/env node
/**
 * Backfill still derivatives:
 *  - media/{section}/thumbs/{id}.jpg          (720 globe / WebGL)
 *  - media/{section}/thumbs/{id}-{480|960|1600}.{avif,webp,jpg}  (HQ grid)
 *
 * Usage:
 *   node scripts/generate-still-thumbs.mjs
 *   node scripts/generate-still-thumbs.mjs --limit 20
 *   node scripts/generate-still-thumbs.mjs --force
 *   node scripts/generate-still-thumbs.mjs --prefix media/about/
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
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

const FORCE = process.argv.includes('--force')
const limitArg = process.argv.find((a) => a.startsWith('--limit'))
const LIMIT = limitArg
  ? Number(limitArg.includes('=') ? limitArg.split('=')[1] : process.argv[process.argv.indexOf(limitArg) + 1])
  : Infinity
const prefixArg = process.argv.find((a) => a.startsWith('--prefix'))
const PREFIX = prefixArg
  ? (prefixArg.includes('=') ? prefixArg.split('=')[1] : process.argv[process.argv.indexOf(prefixArg) + 1])
  : 'media/stills/'

const EDGES = [480, 960, 1600]
const FORMATS = [
  { ext: 'avif', type: 'image/avif', quality: 80 },
  { ext: 'webp', type: 'image/webp', quality: 90 },
  { ext: 'jpg', type: 'image/jpeg', quality: 90 },
]

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
      if (key.includes('/thumbs/') || key.includes('/posters/')) continue
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

async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function put(key, body, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE,
    }),
  )
}

function stemFor(originalKey) {
  const m = originalKey.match(/^(media\/[^/]+)\/([^/]+)$/)
  if (!m) return null
  const base = m[2].replace(/\.[^.]+$/, '')
  return `${m[1]}/thumbs/${base}`
}

async function main() {
  const keys = await listKeys()
  console.log(`Found ${keys.length} images in s3://${BUCKET}/${PREFIX}`)
  let done = 0
  let skipped = 0
  for (const key of keys) {
    if (done >= LIMIT) break
    const stem = stemFor(key)
    if (!stem) continue

    const globeKey = `${stem}.jpg`
    const needed = [globeKey]
    for (const edge of EDGES) {
      for (const f of FORMATS) needed.push(`${stem}-${edge}.${f.ext}`)
    }

    if (!FORCE) {
      const missing = []
      for (const k of needed) {
        if (!(await exists(k))) missing.push(k)
      }
      if (!missing.length) {
        skipped += 1
        continue
      }
    }

    const got = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const buf = await bodyToBuffer(got.Body)

    const globe = await sharp(buf)
      .rotate()
      .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer()
    await put(globeKey, globe, 'image/jpeg')

    for (const edge of EDGES) {
      const resized = sharp(buf)
        .rotate()
        .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
      for (const f of FORMATS) {
        let out
        if (f.ext === 'avif') out = await resized.clone().avif({ quality: f.quality }).toBuffer()
        else if (f.ext === 'webp') out = await resized.clone().webp({ quality: f.quality }).toBuffer()
        else out = await resized.clone().jpeg({ quality: f.quality, mozjpeg: true }).toBuffer()
        await put(`${stem}-${edge}.${f.ext}`, out, f.type)
      }
    }

    done += 1
    console.log(`✓ ${stem}-* (+ globe) from ${key}`)
  }
  console.log(`Done. created=${done} already_complete=${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
