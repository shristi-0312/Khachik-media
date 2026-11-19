import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { config } from './config.js'
import type { MediaSectionId } from './mediaSections.js'
import {
  isImageContentType,
  makeAllStillDerivatives,
  thumbKeyFor,
} from './thumbs.js'
import {
  isVideoContentType,
  optimizeVideoBuffer,
  posterKeyFor,
} from './videoOptimize.js'

/** Disable default flexible checksums — they break browser PUTs to presigned URLs. */
const client = new S3Client({
  region: config.awsRegion,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

function extensionFor(contentType: string, filename?: string): string {
  if (filename?.includes('.')) {
    return filename.split('.').pop()!.toLowerCase()
  }
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  }
  return map[contentType] ?? 'bin'
}

function publicBase() {
  return config.cloudfrontUrl || `https://${config.s3Bucket}.s3.${config.awsRegion}.amazonaws.com`
}

function mediaKey(section: MediaSectionId, contentType: string, filename?: string) {
  const ext = extensionFor(contentType, filename)
  return `media/${section}/${randomUUID()}.${ext}`
}

/** UUID keys are immutable — long browser/CDN cache for full-quality originals. */
const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable'

async function streamToBuffer(body: Buffer | Uint8Array | Readable): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body
  if (body instanceof Uint8Array) return Buffer.from(body)
  const chunks: Buffer[] = []
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function putObject(key: string, body: Buffer, contentType: string) {
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: MEDIA_CACHE_CONTROL,
    }),
  )
}

/**
 * Write globe 720 JPEG + HQ responsive grid derivatives (480/960/1600 × AVIF/WebP/JPEG).
 * Returns the legacy globe thumb key for upload response compatibility.
 */
async function putGlobeThumbFromBuffer(originalKey: string, buffer: Buffer): Promise<string | null> {
  if (!thumbKeyFor(originalKey)) return null
  try {
    const { globeKey, globeBody, grid } = await makeAllStillDerivatives(originalKey, buffer)
    if (globeKey && globeBody) {
      await putObject(globeKey, globeBody, 'image/jpeg')
    }
    await Promise.all(grid.map((d) => putObject(d.key, d.body, d.contentType)))
    return globeKey
  } catch (err) {
    console.error('still derivatives failed', originalKey, err)
    return null
  }
}

/** Original-bytes upload — no transcode; Content-Type preserved for HQ delivery. */
async function signPut(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: MEDIA_CACHE_CONTROL,
  })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 15 })
  return {
    key,
    uploadUrl,
    publicUrl: `${publicBase()}/${key}`,
    cacheControl: MEDIA_CACHE_CONTROL,
  }
}

/** @deprecated Prefer createMediaPresignedUpload — kept for legacy project editor. */
export async function createPresignedUpload(input: {
  slug: string
  contentType: string
  filename?: string
}): Promise<{ key: string; uploadUrl: string; publicUrl: string; cacheControl: string }> {
  const ext = extensionFor(input.contentType, input.filename)
  return signPut(`projects/${input.slug}/${randomUUID()}.${ext}`, input.contentType)
}

export async function createMediaPresignedUpload(input: {
  section: MediaSectionId
  contentType: string
  filename?: string
}): Promise<{ key: string; uploadUrl: string; publicUrl: string; cacheControl: string }> {
  return signPut(mediaKey(input.section, input.contentType, input.filename), input.contentType)
}

/**
 * After a browser PUT to a presigned URL, generate the globe tile from the
 * object already in S3 (key or public CloudFront URL).
 */
export async function ensureGlobeThumb(input: {
  key?: string
  publicUrl?: string
}): Promise<{ thumbKey: string | null; thumbUrl: string | null }> {
  let key = input.key?.replace(/^\//, '')
  if (!key && input.publicUrl) {
    try {
      const u = new URL(input.publicUrl)
      key = u.pathname.replace(/^\//, '')
    } catch {
      key = undefined
    }
  }
  if (!key || !key.startsWith('media/')) {
    return { thumbKey: null, thumbUrl: null }
  }
  if (key.includes('/thumbs/')) {
    return { thumbKey: key, thumbUrl: `${publicBase()}/${key}` }
  }

  const got = await client.send(
    new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }),
  )
  const bytes = await streamToBuffer(got.Body as Readable)
  const thumbKey = await putGlobeThumbFromBuffer(key, bytes)
  return {
    thumbKey,
    thumbUrl: thumbKey ? `${publicBase()}/${thumbKey}` : null,
  }
}

/**
 * After a browser PUT, move the moov atom to the front and store a JPEG poster.
 * The video is copied, not re-encoded. Missing ffmpeg leaves the original in place.
 */
export async function ensureVideoDelivery(input: {
  key?: string
  publicUrl?: string
}): Promise<{ posterKey: string | null; posterUrl: string | null }> {
  let key = input.key?.replace(/^\//, '')
  if (!key && input.publicUrl) {
    try {
      const u = new URL(input.publicUrl)
      key = u.pathname.replace(/^\//, '')
    } catch {
      key = undefined
    }
  }
  const posterKey = key ? posterKeyFor(key) : null
  if (!key || !posterKey) {
    return { posterKey: null, posterUrl: null }
  }

  const got = await client.send(
    new GetObjectCommand({ Bucket: config.s3Bucket, Key: key }),
  )
  const bytes = await streamToBuffer(got.Body as Readable)
  const contentType = got.ContentType || 'video/mp4'
  const optimized = await optimizeVideoBuffer(bytes, contentType)
  if (optimized.video) {
    await putObject(key, optimized.video, contentType)
  }
  if (optimized.poster) {
    await putObject(posterKey, optimized.poster, 'image/jpeg')
    return { posterKey, posterUrl: `${publicBase()}/${posterKey}` }
  }
  return { posterKey: null, posterUrl: null }
}

/** Server-side put — used when the browser cannot PUT directly to S3 (CORS/network). */
export async function putMediaObject(input: {
  section: MediaSectionId
  contentType: string
  filename?: string
  body: Buffer | Uint8Array | Readable
}): Promise<{ key: string; publicUrl: string; thumbUrl?: string; posterUrl?: string }> {
  const key = mediaKey(input.section, input.contentType, input.filename)
  const buffer = await streamToBuffer(input.body)

  let body = buffer
  let posterUrl: string | undefined
  if (isVideoContentType(input.contentType)) {
    const optimized = await optimizeVideoBuffer(buffer, input.contentType)
    if (optimized.video) body = optimized.video
    const posterKey = posterKeyFor(key)
    if (optimized.poster && posterKey) {
      await putObject(posterKey, optimized.poster, 'image/jpeg')
      posterUrl = `${publicBase()}/${posterKey}`
    }
  }

  await putObject(key, body, input.contentType)

  let thumbUrl: string | undefined
  if (isImageContentType(input.contentType)) {
    const thumbKey = await putGlobeThumbFromBuffer(key, buffer)
    if (thumbKey) thumbUrl = `${publicBase()}/${thumbKey}`
  }

  return {
    key,
    publicUrl: `${publicBase()}/${key}`,
    ...(thumbUrl ? { thumbUrl } : {}),
    ...(posterUrl ? { posterUrl } : {}),
  }
}
