import { apiConfigured, fetchMedia } from '../api/client'
import { globeTileUrl, HERO_CDN_URL, HERO_FALLBACK_URL, stillThumbUrl } from './cdn'
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
        // First decoded frame is enough to lift — keep buffering after open.
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

/**
 * Prefer the visible hero <video> for the hero CDN URL so we do not download
 * the same file twice. Other URLs use a short-lived warmer element.
 */
function preloadVideo(url: string, onProgress: ProgressCb): Promise<void> {
  const isHero = url === HERO_CDN_URL || url === HERO_FALLBACK_URL
  if (isHero) {
    const existing = document.querySelector<HTMLVideoElement>('[data-boot-video="hero"]')
    if (existing) {
      existing.preload = 'auto'
      // Kick playback/buffering without resetting an in-flight download.
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
  // Prefer the shared still cache so StillsPage can reuse decoded thumbs.
  if (url.includes('/stills/') || url.includes('/thumbs/')) {
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

/** Above-fold + near-fold tiles for the Stills masonry (matches TILES length). */
const STILLS_BOOT_COUNT = 24

function routeKind(pathname: string): 'home' | 'films' | 'stills' | 'other' {
  const path = pathname.replace(/\/dark(?=\/|$)/, '') || '/'
  if (path === '/' || path === '') return 'home'
  if (path.startsWith('/films')) return 'films'
  if (path.startsWith('/stills')) return 'stills'
  return 'other'
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
        : kind === 'other'
          ? heroRatio
          : heroRatio * 0.25 + extrasRatio * 0.75
    onProgress(clamp01(ratio))
  }

  const heroTask = (async () => {
    if (kind !== 'home' && kind !== 'other') {
      heroRatio = 1
      publish()
      return
    }
    // Wait a frame so HomePage can mount the hero under the shutter.
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
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
        // Warm a small local set for immediate globe paint; CDN thumbs continue after open.
        const local = LOCAL_GLOBE_STILLS.slice(0, 8)
        let done = 0
        await Promise.all(
          local.map(async (url) => {
            await preloadImage(url)
            done += 1
            extrasRatio = done / local.length
            publish()
          }),
        )
        // Kick remaining local + CDN thumbs without blocking the shutter.
        void (async () => {
          await Promise.all(LOCAL_GLOBE_STILLS.slice(8).map((url) => preloadImage(url)))
          if (!apiConfigured()) return
          try {
            const items = await fetchMedia('stills')
            // Warm the same CloudFront thumb URLs the Stills grid uses (not /cf proxy).
            const thumbs = items
              .filter((i) => i.mediaType === 'image' && i.url)
              .slice(0, 28)
              .map((i) => stillThumbUrl(i.url))
            await warmStills(thumbs)
            // Globe WebGL still needs same-origin /cf tiles — warm those too.
            void Promise.all(thumbs.map((url) => preloadImage(globeTileUrl(url))))
          } catch {
            /* non-blocking warm */
          }
        })()
        extrasRatio = 1
        publish()
        return
      }

      if (kind === 'stills') {
        // Use the 0→100 shutter window to warm CDN thumbs (not multi-MB originals).
        let thumbs: string[] = []
        if (apiConfigured()) {
          try {
            const items = await fetchMedia('stills')
            thumbs = items
              .filter((i) => i.mediaType === 'image' && i.url)
              .map((i) => stillThumbUrl(i.url))
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
        // Any remaining library thumbs continue after the shutter lifts.
        if (thumbs.length > STILLS_BOOT_COUNT) {
          void warmStills(thumbs.slice(STILLS_BOOT_COUNT))
        }
        extrasRatio = 1
        publish()
        return
      }

      // Films paint from posters and in-view loads — do not hold the shutter.
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
