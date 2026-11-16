/**
 * Delete all media library items + projects from local and prod APIs,
 * and empty the S3 media/ prefix (original HQ uploads).
 * Usage: node scripts/clear-media.mjs
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../.env') })

const BUCKET = process.env.S3_BUCKET || 'khachik-media-assets'
const REGION = process.env.AWS_REGION || 'ap-south-1'
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!email || !password) {
  console.error('ADMIN_EMAIL / ADMIN_PASSWORD required')
  process.exit(1)
}

const APIS = [
  { name: 'local', base: 'http://127.0.0.1:4000' },
  { name: 'prod', base: 'https://65-2-150-121.sslip.io/api' },
]

const s3 = new S3Client({ region: REGION })

async function login(base) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login ${base} → ${res.status}`)
  const data = await res.json()
  if (!data.token) throw new Error(`login ${base}: no token`)
  return data.token
}

async function authed(base, token, pathName, init = {}) {
  const res = await fetch(`${base}${pathName}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`${init.method || 'GET'} ${pathName} → ${res.status} ${text}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function clearApi(api) {
  const token = await login(api.base)
  const media = (await authed(api.base, token, '/admin/media')) ?? []
  const projects = (await authed(api.base, token, '/admin/projects')) ?? []
  console.log(`${api.name}: deleting ${media.length} media, ${projects.length} projects`)

  for (const item of media) {
    await authed(api.base, token, `/admin/media/${item.id}`, { method: 'DELETE' })
  }
  for (const project of projects) {
    await authed(api.base, token, `/admin/projects/${project.id}`, { method: 'DELETE' })
  }

  const leftMedia = await fetch(`${api.base}/media`).then((r) => r.json())
  const leftProjects = await fetch(`${api.base}/projects`).then((r) => r.json())
  console.log(
    `${api.name}: public left media=${leftMedia.length} projects=${leftProjects.length}`,
  )
}

async function clearS3Prefix(prefix) {
  let token
  let deleted = 0
  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    )
    const keys = (listed.Contents ?? []).map((o) => ({ Key: o.Key })).filter((k) => k.Key)
    if (keys.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: keys, Quiet: true },
        }),
      )
      deleted += keys.length
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (token)
  console.log(`S3 ${prefix}: deleted ${deleted} objects`)
}

async function main() {
  for (const api of APIS) {
    try {
      await clearApi(api)
    } catch (err) {
      console.error(`${api.name}: FAILED`, err instanceof Error ? err.message : err)
    }
  }

  await clearS3Prefix('media/')
  await clearS3Prefix('projects/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
