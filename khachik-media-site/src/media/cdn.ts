/** Public CloudFront host for media assets. */
export const CLOUDFRONT_HOST = 'd1rkq96nxpa3sq.cloudfront.net'

/** Public CloudFront hero reel — full-quality original. */
export const HERO_CDN_URL = `https://${CLOUDFRONT_HOST}/media/hero/hero.mp4`

/** First-frame JPEG written next to a faststart remux. Missing posters 404 quietly. */
export const HERO_POSTER_URL = `https://${CLOUDFRONT_HOST}/media/hero/posters/hero.jpg`

/** `…/media/{section}/{id}.mp4` → `…/media/{section}/posters/{id}.jpg` on the same host. */
export function videoPosterUrl(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const m = parsed.pathname.match(/^(\/media\/[^/]+)\/([^/]+)\.(mp4|mov|webm)$/i)
    if (!m) return null
    parsed.pathname = `${m[1]}/posters/${m[2]}.jpg`
    if (parsed.hostname === CLOUDFRONT_HOST || parsed.hostname.endsWith('.cloudfront.net')) {
      return parsed.toString()
    }
    return parsed.pathname
  } catch {
    return null
  }
}

/** Local fallback when CDN is unreachable. */
export const HERO_FALLBACK_URL = '/media/hero.mp4'

/**
 * Same-origin proxy path for WebGL textures.
 * CloudFront often omits CORS ACAO for canvas/WebGL; `/cf/...` is rewritten
 * by Vite (dev) and Vercel (prod) so TextureLoader / VideoTexture work.
 */
export function globeMediaUrl(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (parsed.hostname === CLOUDFRONT_HOST || parsed.hostname.endsWith('.cloudfront.net')) {
      return `/cf${parsed.pathname}${parsed.search}`
    }
  } catch {
    /* keep original */
  }
  return url
}

/**
 * Map a full-res library still to its CDN globe tile:
 * `media/{section}/{id}.ext` → `media/{section}/thumbs/{id}.jpg`
 * (generated on upload / backfill — ~50–150KB vs multi-MB originals).
 */
export function globeTileUrl(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const path = parsed.pathname
    if (path.includes('/thumbs/')) return globeMediaUrl(url)

    const m = path.match(/^(\/media\/[^/]+)\/([^/]+)$/)
    if (m) {
      const base = m[2]!.replace(/\.[^.]+$/, '.jpg')
      parsed.pathname = `${m[1]}/thumbs/${base}`
      return globeMediaUrl(parsed.toString())
    }
  } catch {
    /* keep original */
  }
  return globeMediaUrl(url)
}
