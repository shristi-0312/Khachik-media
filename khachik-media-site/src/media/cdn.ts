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
 * Map a full-res library still to its CDN globe tile (720 JPEG):
 * `media/{section}/{id}.ext` → `media/{section}/thumbs/{id}.jpg`
 */
export function stillThumbUrl(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const path = parsed.pathname
    if (path.includes('/thumbs/')) return parsed.toString()

    const m = path.match(/^(\/media\/[^/]+)\/([^/]+)$/)
    if (m) {
      const base = m[2]!.replace(/\.[^.]+$/, '.jpg')
      parsed.pathname = `${m[1]}/thumbs/${base}`
      return parsed.toString()
    }
  } catch {
    /* keep original */
  }
  return url
}

/**
 * HQ grid display JPEG (1600) — prefer API thumbUrl when present.
 * `…/{id}.ext` → `…/thumbs/{id}-1600.jpg`
 */
export function stillDisplayUrl(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const path = parsed.pathname
    if (path.includes('/thumbs/') && /-\d+\.(jpe?g|webp|avif)$/i.test(path)) {
      return parsed.toString()
    }
    const m = path.match(/^(\/media\/[^/]+)\/([^/]+)$/)
    if (m) {
      const base = m[2]!.replace(/\.[^.]+$/, '')
      parsed.pathname = `${m[1]}/thumbs/${base}-1600.jpg`
      return parsed.toString()
    }
    // Legacy globe thumb path → upgrade to 1600 jpg
    const legacy = path.match(/^(\/media\/[^/]+\/thumbs\/)([^/]+)\.jpe?g$/i)
    if (legacy && !/-\d+$/.test(legacy[2]!)) {
      parsed.pathname = `${legacy[1]}${legacy[2]}-1600.jpg`
      return parsed.toString()
    }
  } catch {
    /* keep original */
  }
  return stillThumbUrl(url)
}

export type StillSrcSet = {
  avif: string
  webp: string
  jpg: string
}

/** Build responsive srcsets from an original URL (path convention). */
export function stillSrcSet(url: string): StillSrcSet | null {
  if (!url) return null
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const m = parsed.pathname.match(/^(\/media\/[^/]+)\/([^/]+)$/)
    if (!m) return null
    const base = m[2]!.replace(/\.[^.]+$/, '')
    const stem = `${m[1]}/thumbs/${base}`
    const edges = [480, 960, 1600] as const
    const build = (ext: string) =>
      edges
        .map((e) => {
          const u = new URL(parsed.toString())
          u.pathname = `${stem}-${e}.${ext}`
          return `${u.toString()} ${e}w`
        })
        .join(', ')
    return { avif: build('avif'), webp: build('webp'), jpg: build('jpg') }
  } catch {
    return null
  }
}

/**
 * Same thumb as stillThumbUrl, but same-origin `/cf/...` for WebGL textures.
 */
export function globeTileUrl(url: string): string {
  return globeMediaUrl(stillThumbUrl(url))
}

/** Inject temporary preload links for above-fold stills (no visual change). */
export function preloadStillLinks(urls: string[], limit = 4) {
  if (typeof document === 'undefined') return () => {}
  const created: HTMLLinkElement[] = []
  for (const href of urls.slice(0, limit)) {
    if (!href) continue
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    document.head.appendChild(link)
    created.push(link)
  }
  return () => {
    for (const link of created) link.remove()
  }
}
