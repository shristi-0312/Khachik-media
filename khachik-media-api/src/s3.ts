import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import type { MediaSectionId } from './mediaSections.js'

const client = new S3Client({ region: config.awsRegion })

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
  const ext = extensionFor(input.contentType, input.filename)
  return signPut(`media/${input.section}/${randomUUID()}.${ext}`, input.contentType)
}
