/**
 * Upload local still JPGs to S3 and register them in the media library (local + prod).
 * Usage: node scripts/seed-stills.mjs
 */
import { createReadStream, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../.env') })

const STILLS_DIR = path.resolve(
  here,
  '../../khachik-media-site/public/media/stills',
)
const BUCKET = process.env.S3_BUCKET || 'khachik-media-assets'
const REGION = process.env.AWS_REGION || 'ap-south-1'
const CF = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '')
const PUBLIC_BASE = CF || `https://${BUCKET}.s3.${REGION}.amazonaws.com`

const APIS = [
  { name: 'local', base: 'http://127.0.0.1:4000' },
  { name: 'prod', base: 'https://65-2-150-121.sslip.io/api' },
]

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!email || !password) {
  console.error('ADMIN_EMAIL / ADMIN_PASSWORD required in khachik-media-api/.env')
  process.exit(1)
}

const s3 = new S3Client({ region: REGION })

function listStills() {
  return readdirSync(STILLS_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)?.[0] ?? 0)
      const nb = Number(b.match(/\d+/)?.[0] ?? 0)
      return na - nb || a.localeCompare(b)
    })
}

async function login(base) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login ${base} → ${res.status}`)
  const data = await res.json()
  const token = data.token || data.accessToken
  if (!token) throw new Error(`login ${base}: no token in response`)
  return token
}

async function existingStills(base, token) {
  const res = await fetch(`${base}/admin/media?section=stills`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`list stills ${base} → ${res.status}`)
  return (await res.json())
}

async function createStill(base, token, body) {
  const res = await fetch(`${base}/admin/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`create ${base} → ${res.status} ${text}`)
  }
  return res.json()
}

async function uploadFile(file) {
  const key = `media/stills/${file}`
  const full = path.join(STILLS_DIR, file)
  const contentType = file.toLowerCase().endsWith('.png')
    ? 'image/png'
    : file.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'
  const body = createReadStream(full)
  const size = statSync(full).size
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: size,
    }),
  )
  return { key, url: `${PUBLIC_BASE}/${key}`, contentType }
}

async function main() {
  const files = listStills()
  console.log(`Found ${files.length} still files in ${STILLS_DIR}`)

  const uploaded = []
  for (const file of files) {
    process.stdout.write(`S3 ${file}… `)
    const out = await uploadFile(file)
    uploaded.push({ file, ...out })
    console.log('ok')
  }

  for (const api of APIS) {
    try {
      const token = await login(api.base)
      const existing = await existingStills(api.base, token)
      const existingUrls = new Set(existing.map((i) => i.url))
      console.log(`${api.name}: ${existing.length} stills already`)

      let added = 0
      for (let i = 0; i < uploaded.length; i++) {
        const item = uploaded[i]
        if (existingUrls.has(item.url)) continue
        await createStill(api.base, token, {
          section: 'stills',
          title: item.file.replace(/\.[^.]+$/, ''),
          dateLabel: '',
          mediaType: 'image',
          url: item.url,
          published: true,
          sortOrder: i + 1,
        })
        added++
      }
      console.log(`${api.name}: added ${added} stills`)
    } catch (err) {
      console.error(`${api.name}: FAILED`, err instanceof Error ? err.message : err)
    }
  }

  const prodCheck = await fetch('https://65-2-150-121.sslip.io/api/media?section=stills')
  const stills = await prodCheck.json()
  console.log(`Prod public stills count: ${Array.isArray(stills) ? stills.length : stills}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
