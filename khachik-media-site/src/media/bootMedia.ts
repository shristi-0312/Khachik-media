import { apiConfigured, fetchMedia } from '../api/client'
import {
  globeTileUrl,
  HERO_CDN_URL,
  HERO_FALLBACK_URL,
  HERO_POSTER_URL,
  stillDisplayUrl,
  videoPosterUrl,
} from './cdn'
import { warmStill, warmStills } from './stillCache'

/** Local lightweight stills — paint the sphere before CDN thumbs arrive. */
const LOCAL_GLOBE_STILLS = Array.from(
  { length: 24 },
  (_, i) => `/media/stills/still-${(i % 42) + 1}.jpg`,
)

/** Soft ceiling so a slow link never traps visitors behind the shutter forever. */
const MAX_BOOT_MS = 4_000

/** First playable chunk is enough — keep buffering after the shutter lifts. */
const READY_BUFFER_SECONDS = 0.4

/** Above-fold only — rest warm after the shutter lifts. */
const STILLS_BOOT_COUNT = 8
const HOME_GLOBE_WARM = 8
const FILMS_POSTER_WARM = 4
const ABOUT_FEATURED_WARM = 6

type ProgressCb = (ratio: number) => void

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve('timeout'), ms)
    promise.then(
      (v) => {
        window.clearTimeout(t)
        resolve(v)
      },
      () => {
        window.clearTimeout(t)
        resolve('timeout')
      },
    )
  })
}

function bindVideoProgress(video: HTMLVideoElement, onProgress: ProgressCb): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      onProgress(1)
      resolve()
    }

    const report = () => {
      if (!video.duration || !Number.isFinite(video.duration) || video.duration <= 0) {
        onProgress(video.readyState >= 2 ? 0.45 : 0.1)
        if (video.readyState >= 2) finish()
        return
      }
      let end = 0
      try {
        if (video.buffered.length > 0) {
          end = video.buffered.end(video.buffered.length - 1)
        }
      } catch {
        /* ignore */
      }
      const byTime = end / video.duration
      const readyEnough =
        video.readyState >= 2 ||
        end >= Math.min(READY_BUFFER_SECONDS, video.duration * 0.08)
      onProgress(clamp01(Math.max(byTime, readyEnough ? 0.9 : byTime)))
      if (readyEnough) finish()
    }

    video.addEventListener('progress', report)
    video.addEventListener('loadeddata', report)
    video.addEventListener('canplay', report)
    video.addEventListener('canplaythrough', finish)
    video.addEventListener('error', () => finish())
    report()
    void video.play().then(() => video.pause()).catch(() => {})
  })
}

function preloadVideo(url: string, onProgress: ProgressCb): Promise<void> {
  const isHero = url === HERO_CDN_URL || url === HERO_FALLBACK_URL
  if (isHero) {
    const existing = document.querySelector<HTMLVideoElement>('[data-boot-video="hero"]')
    if (existing) {
      existing.preload = 'auto'
      void existing.play().catch(() => {})
      return bindVideoProgress(existing, onProgress)
    }
  }

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.setAttribute('playsinline', '')
    video.setAttribute('muted', '')
    Object.assign(video.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
      left: '-9999px',
      top: '0',
    })
    document.body.appendChild(video)
    video.src = url
    video.load()
    void bindVideoProgress(video, onProgress).then(() => {
      window.setTimeout(() => {
        video.pause()
        video.removeAttribute('src')
        video.load()
        video.remove()
      }, 4_000)
      resolve()
    })
  })
}

function preloadImage(url: string): Promise<void> {
  if (url.includes('/stills/') || url.includes('/thumbs/') || url.includes('/posters/')) {
    return warmStill(url)
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

function routeKind(pathname: string): 'home' | 'films' | 'stills' | 'about' | 'other' {
  const path = pathname.replace(/\/dark(?=\/|$)/, '') || '/'
  if (path === '/' || path === '') return 'home'
  if (path.startsWith('/films')) return 'films'
  if (path.startsWith('/stills')) return 'stills'
  if (path.startsWith('/about')) return 'about'
  return 'other'
}

function displayThumb(item: { url: string; thumbUrl?: string | null }): string {
  return item.thumbUrl || stillDisplayUrl(item.url)
}

/**
 * During the splash, download the assets the visitor is about to see so the
 * shutter reveals full-quality CDN media instead of empty frames.
 */
export async function bootCriticalMedia(
  pathname: string,
  onProgress: ProgressCb = () => {},
): Promise<void> {
  const kind = routeKind(pathname)
  let heroRatio = 0
  let extrasRatio = 0

  const publish = () => {
    const ratio =
      kind === 'home'
        ? heroRatio * 0.85 + extrasRatio * 0.15
        : kind === 'stills' || kind === 'films' || kind === 'about'
          ? heroRatio * 0.15 + extrasRatio * 0.85
          : heroRatio
    onProgress(clamp01(ratio))
  }

  const heroTask = (async () => {
    // Only the home hero needs the full reel during boot.
    if (kind !== 'home') {
      heroRatio = 1
      publish()
      return
    }
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    // Poster first (tiny), then first playable chunk of the hero MP4.
    void preloadImage(HERO_POSTER_URL)
    await preloadVideo(HERO_CDN_URL, (r) => {
      heroRatio = r
      publish()
    }).catch(() =>
      preloadVideo(HERO_FALLBACK_URL, (r) => {
        heroRatio = r
        publish()
      }),
    )
    heroRatio = 1
    publish()
  })()

  const extrasTask = (async () => {
    try {
      if (kind === 'home') {
        const local = LOCAL_GLOBE_STILLS.slice(0, HOME_GLOBE_WARM)
        let done = 0
        await Promise.all(
          local.map(async (url) => {
            await preloadImage(url)
            done += 1
            extrasRatio = done / local.length
            publish()
          }),
        )
        // After open: more local tiles + one set of CF globe tiles (not dual CF+/cf).
        void (async () => {
          await Promise.all(LOCAL_GLOBE_STILLS.slice(HOME_GLOBE_WARM).map((url) => preloadImage(url)))
          if (!apiConfigured()) return
          try {
            const items = await fetchMedia('stills')
            const globeTiles = items
              .filter((i) => i.mediaType === 'image' && i.url)
              .slice(0, HOME_GLOBE_WARM)
              .map((i) => globeTileUrl(i.globeThumbUrl || i.url))
            await warmStills(globeTiles)
          } catch {
            /* non-blocking */
          }
        })()
        extrasRatio = 1
        publish()
        return
      }

      if (kind === 'stills') {
        let thumbs: string[] = []
        if (apiConfigured()) {
          try {
            const items = await fetchMedia('stills')
            thumbs = items
              .filter((i) => i.mediaType === 'image' && i.url)
              .map(displayThumb)
          } catch {
            thumbs = []
          }
        }
        if (!thumbs.length) {
          thumbs = LOCAL_GLOBE_STILLS.slice(0, STILLS_BOOT_COUNT)
        }
        const priority = thumbs.slice(0, STILLS_BOOT_COUNT)
        await warmStills(priority, (done, total) => {
          extrasRatio = done / Math.max(1, total)
          publish()
        })
        if (thumbs.length > STILLS_BOOT_COUNT) {
          void warmStills(thumbs.slice(STILLS_BOOT_COUNT))
        }
        extrasRatio = 1
        publish()
        return
      }

      if (kind === 'films') {
        if (apiConfigured()) {
          try {
            const short = await fetchMedia('films_short_forms')
            const posters = short
              .filter((i) => i.mediaType === 'video' && i.url)
              .slice(0, FILMS_POSTER_WARM)
              .map((i) => i.posterUrl || videoPosterUrl(i.url))
              .filter((u): u is string => Boolean(u))
            await warmStills(posters, (done, total) => {
              extrasRatio = done / Math.max(1, total)
              publish()
            })
          } catch {
            /* ignore */
          }
        }
        extrasRatio = 1
        publish()
        return
      }

      if (kind === 'about') {
        if (apiConfigured()) {
          try {
            const items = await fetchMedia('about')
            const urls: string[] = []
            for (const i of items.slice(0, ABOUT_FEATURED_WARM)) {
              if (i.mediaType === 'image' && i.url) urls.push(displayThumb(i))
              else if (i.mediaType === 'video') {
                const p = i.posterUrl || videoPosterUrl(i.url)
                if (p) urls.push(p)
              }
            }
            await warmStills(urls, (done, total) => {
              extrasRatio = done / Math.max(1, total)
              publish()
            })
          } catch {
            /* ignore */
          }
        }
        extrasRatio = 1
        publish()
        return
      }

      extrasRatio = 1
      publish()
    } catch {
      extrasRatio = 1
      publish()
    }
  })()

  const result = await withTimeout(Promise.all([heroTask, extrasTask]), MAX_BOOT_MS)
  if (result === 'timeout') {
    onProgress(1)
  }
}
