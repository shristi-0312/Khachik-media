import sharp from 'sharp'

/** Long-edge for globe / grid tiles — Griflan-sized, not camera originals. */
export const GLOBE_THUMB_MAX_EDGE = 720
export const GLOBE_THUMB_JPEG_QUALITY = 72

/**
 * Derivative key: `media/stills/{id}.jpg` → `media/stills/thumbs/{id}.jpg`
 * Same pattern for any `media/{section}/{file}`.
 */
export function thumbKeyFor(originalKey: string): string | null {
  const m = originalKey.match(/^(media\/[^/]+)\/([^/]+)$/)
  if (!m) return null
  if (m[1]!.endsWith('/thumbs')) return null
  return `${m[1]}/thumbs/${m[2]}`
}

export function isImageContentType(contentType: string): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif)$/i.test(contentType)
}

/** Resize + recompress for fast CDN tile delivery. */
export async function makeGlobeThumb(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width: GLOBE_THUMB_MAX_EDGE,
      height: GLOBE_THUMB_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: GLOBE_THUMB_JPEG_QUALITY, mozjpeg: true })
    .toBuffer()
}
