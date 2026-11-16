import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { config } from './config.js'
import type { MediaSectionId } from './mediaSections.js'

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

/** Original-bytes upload — no transcode; Content-Type preserved for HQ delivery. */
async function signPut(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 15 })
  return {
    key,
    uploadUrl,
    publicUrl: `${publicBase()}/${key}`,
  }
}

/** @deprecated Prefer createMediaPresignedUpload — kept for legacy project editor. */
export async function createPresignedUpload(input: {
  slug: string
  contentType: string
  filename?: string
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const ext = extensionFor(input.contentType, input.filename)
  return signPut(`projects/${input.slug}/${randomUUID()}.${ext}`, input.contentType)
}

export async function createMediaPresignedUpload(input: {
  section: MediaSectionId
  contentType: string
  filename?: string
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  return signPut(mediaKey(input.section, input.contentType, input.filename), input.contentType)
}

/** Server-side put — used when the browser cannot PUT directly to S3 (CORS/network). */
export async function putMediaObject(input: {
  section: MediaSectionId
  contentType: string
  filename?: string
  body: Buffer | Uint8Array | Readable
}): Promise<{ key: string; publicUrl: string }> {
  const key = mediaKey(input.section, input.contentType, input.filename)
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  )
  return { key, publicUrl: `${publicBase()}/${key}` }
}
