import sharp from 'sharp'

/** Globe / WebGL texture tile — small, CORS via /cf. */
export const GLOBE_THUMB_MAX_EDGE = 720
export const GLOBE_THUMB_JPEG_QUALITY = 72

/**
 * Marketing grid / card display — sharp on 2× retina, still tiny vs masters.
 * Quality is the USP: never go softer than these settings.
 */
export const GRID_EDGE_SIZES = [480, 960, 1600] as const
export type GridEdge = (typeof GRID_EDGE_SIZES)[number]
export const GRID_JPEG_QUALITY = 90
export const GRID_WEBP_QUALITY = 90
export const GRID_AVIF_QUALITY = 80

export type GridFormat = 'avif' | 'webp' | 'jpg'

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

/** Stem without extension under thumbs/: `media/stills/thumbs/{id}` */
export function thumbStemFor(originalKey: string): string | null {
  const thumbKey = thumbKeyFor(originalKey)
  if (!thumbKey) return null
  return thumbKey.replace(/\.[^.]+$/, '')
}

/** `media/stills/thumbs/{id}-1600.webp` */
export function gridThumbKey(
  originalKey: string,
  edge: GridEdge,
  format: GridFormat,
): string | null {
  const stem = thumbStemFor(originalKey)
  if (!stem) return null
  return `${stem}-${edge}.${format}`
}

/** Legacy globe tile path: `media/stills/thumbs/{id}.jpg` */
export function globeThumbKey(originalKey: string): string | null {
  const stem = thumbStemFor(originalKey)
  if (!stem) return null
  return `${stem}.jpg`
}

export function isImageContentType(contentType: string): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif)$/i.test(contentType)
}

/** Resize + recompress for WebGL / globe tiles. */
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

async function resizeToEdge(buffer: Buffer, edge: GridEdge) {
  return sharp(buffer)
    .rotate()
    .resize({
      width: edge,
      height: edge,
      fit: 'inside',
      withoutEnlargement: true,
    })
}

export async function makeGridThumb(
  buffer: Buffer,
  edge: GridEdge,
  format: GridFormat,
): Promise<Buffer> {
  const base = await resizeToEdge(buffer, edge)
  if (format === 'avif') {
    return base.avif({ quality: GRID_AVIF_QUALITY }).toBuffer()
  }
  if (format === 'webp') {
    return base.webp({ quality: GRID_WEBP_QUALITY }).toBuffer()
  }
  return base.jpeg({ quality: GRID_JPEG_QUALITY, mozjpeg: true }).toBuffer()
}

export type GridDerivative = {
  key: string
  contentType: string
  body: Buffer
  edge: GridEdge
  format: GridFormat
}

const CONTENT_TYPE: Record<GridFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
}

/** All responsive HQ grid files + the legacy 720 globe JPEG. */
export async function makeAllStillDerivatives(
  originalKey: string,
  buffer: Buffer,
): Promise<{ globeKey: string | null; globeBody: Buffer | null; grid: GridDerivative[] }> {
  const globeKey = globeThumbKey(originalKey)
  let globeBody: Buffer | null = null
  if (globeKey) {
    try {
      globeBody = await makeGlobeThumb(buffer)
    } catch (err) {
      console.error('globe thumb failed', originalKey, err)
    }
  }

  const grid: GridDerivative[] = []
  for (const edge of GRID_EDGE_SIZES) {
    for (const format of ['avif', 'webp', 'jpg'] as const) {
      const key = gridThumbKey(originalKey, edge, format)
      if (!key) continue
      try {
        const body = await makeGridThumb(buffer, edge, format)
        grid.push({ key, contentType: CONTENT_TYPE[format], body, edge, format })
      } catch (err) {
        console.error('grid thumb failed', key, err)
      }
    }
  }

  return { globeKey, globeBody, grid }
}
