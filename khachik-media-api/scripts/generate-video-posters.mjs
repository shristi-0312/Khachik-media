#!/usr/bin/env node
/**
 * Backfill video poster JPEGs:
 *   media/{section}/{id}.mp4 → media/{section}/posters/{id}.jpg
 *
 * Usage (on EC2, with ffmpeg + API .env / instance role):
 *   node scripts/generate-video-posters.mjs
 *   node scripts/generate-video-posters.mjs --limit 5
 *   node scripts/generate-video-posters.mjs --force
 *   node scripts/generate-video-posters.mjs --prefix media/films_short_forms/
 *   node scripts/generate-video-posters.mjs --invalidate
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront'
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const envPaths = [path.join(root, 'infra/.env'), path.join(here, '../.env')]

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
const CLOUDFRONT_URL = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '')
if (!BUCKET) {
  console.error('S3_BUCKET missing')
  process.exit(1)
}

const FORCE = process.argv.includes('--force')
const INVALIDATE = process.argv.includes('--invalidate')
const limitArg = process.argv.find((a) => a.startsWith('--limit'))
const LIMIT = limitArg
  ? Number(limitArg.includes('=') ? limitArg.split('=')[1] : process.argv[process.argv.indexOf(limitArg) + 1])
  : Infinity
const prefixArg = process.argv.find((a) => a.startsWith('--prefix'))
const PREFIX = prefixArg
  ? prefixArg.includes('=')
    ? prefixArg.split('=')[1]
    : process.argv[process.argv.indexOf(prefixArg) + 1]
  : 'media/'

const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined

const s3 = new S3Client({ region: REGION, credentials })
const CACHE = 'public, max-age=31536000, immutable'

function posterKeyFor(originalKey) {
  const m = originalKey.match(/^(media\/[^/]+)\/([^/]+)\.(mp4|mov|webm)$/i)
  if (!m) return null
  if (m[1].endsWith('/posters') || m[1].endsWith('/thumbs')) return null
  return `${m[1]}/posters/${m[2]}.jpg`
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    const timer = setTimeout(() => proc.kill('SIGKILL'), 180_000)
    proc.stderr.on('data', (chunk) => {
      err += chunk.toString()
      if (err.length > 8_000) err = err.slice(-4_000)
    })
    proc.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(err.trim() || `ffmpeg exited ${code}`))
    })
  })
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function listVideoKeys() {
  const keys = []
  let token
  do {
    const out = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: token,
      }),
    )
    for (const obj of out.Contents || []) {
      const key = obj.Key
      if (!key) continue
      if (!/\.(mp4|mov|webm)$/i.test(key)) continue
      if (key.includes('/posters/') || key.includes('/thumbs/')) continue
      keys.push(key)
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined
  } while (token)
  return keys
}

async function downloadToFile(key, dest) {
  const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  await pipeline(got.Body, createWriteStream(dest))
}

async function makePoster(videoKey) {
  const posterKey = posterKeyFor(videoKey)
  if (!posterKey) return { skipped: true, reason: 'bad-key' }
  if (!FORCE && (await exists(posterKey))) {
    return { skipped: true, reason: 'exists', posterKey }
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'km-poster-'))
  const ext = path.extname(videoKey) || '.mp4'
  const inputPath = path.join(dir, `in${ext}`)
  const posterPath = path.join(dir, 'poster.jpg')
  try {
    await downloadToFile(videoKey, inputPath)
    await runFfmpeg([
      '-y',
      '-ss',
      '0.1',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      posterPath,
    ])
    const body = await readFile(posterPath)
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: posterKey,
        Body: body,
        ContentType: 'image/jpeg',
        CacheControl: CACHE,
        ContentDisposition: 'inline',
      }),
    )
    return { ok: true, posterKey, bytes: body.length }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function invalidatePosters(paths) {
  if (!paths.length || !CLOUDFRONT_URL) return null
  const host = CLOUDFRONT_URL.replace(/^https?:\/\//, '').split('/')[0]
  const cf = new CloudFrontClient({ region: 'us-east-1', credentials })
  const listed = await cf.send(new ListDistributionsCommand({}))
  const dist = (listed.DistributionList?.Items || []).find((d) => d.DomainName === host)
  if (!dist?.Id) {
    console.warn('No CloudFront distribution for', host)
    return null
  }
  const unique = [...new Set(paths.map((p) => (p.startsWith('/') ? p : `/${p}`)))]
  const out = await cf.send(
    new CreateInvalidationCommand({
      DistributionId: dist.Id,
      InvalidationBatch: {
        CallerReference: `posters-${Date.now()}`,
        Paths: { Quantity: unique.length, Items: unique },
      },
    }),
  )
  return out.Invalidation?.Id
}

const videos = await listVideoKeys()
console.log(`Found ${videos.length} videos under ${PREFIX}`)

const made = []
let done = 0
for (const key of videos) {
  if (done >= LIMIT) break
  process.stdout.write(`→ ${key} ... `)
  try {
    const result = await makePoster(key)
    if (result.skipped) {
      console.log(`skip (${result.reason})`)
    } else {
      console.log(`ok ${result.bytes}b → ${result.posterKey}`)
      made.push(result.posterKey)
    }
  } catch (err) {
    console.log(`FAIL ${err instanceof Error ? err.message : err}`)
  }
  done += 1
}

console.log(`\nCreated ${made.length} posters`)

if (INVALIDATE && made.length) {
  // Also bust any previously cached 403s for the same keys
  const paths = made.map((k) => `/${k}`)
  // CloudFront allows 15 paths per free-tier-ish batch; chunk
  for (let i = 0; i < paths.length; i += 14) {
    const chunk = paths.slice(i, i + 14)
    const id = await invalidatePosters(chunk)
    console.log(`Invalidation ${id || 'n/a'} for ${chunk.length} paths`)
  }
} else if (made.length) {
  console.log('Tip: re-run with --invalidate to purge cached 403s on CloudFront')
}
