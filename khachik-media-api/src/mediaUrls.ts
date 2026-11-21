import { config } from './config.js'
import { GRID_EDGE_SIZES, type GridEdge, type GridFormat } from './thumbs.js'
import { posterKeyFor } from './videoOptimize.js'

function publicBase() {
  return config.cloudfrontUrl || `https://${config.s3Bucket}.s3.${config.awsRegion}.amazonaws.com`
}

function toPublicUrl(key: string): string {
  return `${publicBase()}/${key.replace(/^\//, '')}`
}

/** Extract S3 object key from a CloudFront / S3 public URL or raw key. */
export function keyFromPublicUrl(url: string): string | null {
  if (!url) return null
  if (url.startsWith('media/')) return url
  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(/^\//, '') || null
  } catch {
    return null
  }
}

function thumbStemFromOriginalKey(key: string): string | null {
  const m = key.match(/^(media\/[^/]+)\/([^/]+)$/)
  if (!m) return null
  if (m[1]!.endsWith('/thumbs') || m[1]!.endsWith('/posters')) return null
  const base = m[2]!.replace(/\.[^.]+$/, '')
  return `${m[1]}/thumbs/${base}`
}

export type MediaSrcSet = {
  avif: string
  webp: string
  jpg: string
}

export type MediaThumbs = {
  /** Primary display still (1600 JPEG — universal fallback). */
  thumbUrl: string
  /** Legacy globe / WebGL 720 JPEG. */
  globeThumbUrl: string
  /** Responsive sets per format for <picture>. */
  srcset: {
    avif: string
    webp: string
    jpg: string
  }
  /** Individual size URLs (jpg) for simple srcset consumers. */
  sizes: Record<GridEdge, { avif: string; webp: string; jpg: string }>
}

function gridUrl(stem: string, edge: GridEdge, format: GridFormat): string {
  return toPublicUrl(`${stem}-${edge}.${format}`)
}

/** Derive CDN derivative URLs from an original media URL (path convention). */
export function deriveImageThumbs(originalUrl: string): MediaThumbs | null {
  const key = keyFromPublicUrl(originalUrl)
  if (!key) return null
  const stem = thumbStemFromOriginalKey(key)
  if (!stem) return null

  const sizes = {} as MediaThumbs['sizes']
  for (const edge of GRID_EDGE_SIZES) {
    sizes[edge] = {
      avif: gridUrl(stem, edge, 'avif'),
      webp: gridUrl(stem, edge, 'webp'),
      jpg: gridUrl(stem, edge, 'jpg'),
    }
  }

  const srcset = {
    avif: GRID_EDGE_SIZES.map((e) => `${gridUrl(stem, e, 'avif')} ${e}w`).join(', '),
    webp: GRID_EDGE_SIZES.map((e) => `${gridUrl(stem, e, 'webp')} ${e}w`).join(', '),
    jpg: GRID_EDGE_SIZES.map((e) => `${gridUrl(stem, e, 'jpg')} ${e}w`).join(', '),
  }

  return {
    thumbUrl: sizes[1600].jpg,
    globeThumbUrl: toPublicUrl(`${stem}.jpg`),
    srcset,
    sizes,
  }
}

export function derivePosterUrl(originalUrl: string): string | null {
  const key = keyFromPublicUrl(originalUrl)
  if (!key) return null
  const posterKey = posterKeyFor(key)
  if (!posterKey) return null
  // Query bustes immutable CloudFront 403s cached while posters were missing.
  return `${toPublicUrl(posterKey)}?v=2`
}
