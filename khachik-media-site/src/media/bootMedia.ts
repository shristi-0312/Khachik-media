import { apiConfigured, fetchMedia } from '../api/client'
import { HERO_CDN_URL, HERO_FALLBACK_URL } from './cdn'

/** Soft ceiling so a slow link never traps visitors behind the shutter forever. */
const MAX_BOOT_MS = 14_000

/** Enough buffered media (seconds) to open the site without a stall. */
const READY_BUFFER_SECONDS = 2.5

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
        onProgress(video.readyState >= 2 ? 0.35 : 0.08)
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
      const readyEnough = end >= Math.min(READY_BUFFER_SECONDS, video.duration * 0.2)
      onProgress(clamp01(Math.max(byTime, readyEnough ? 0.85 : byTime)))
      if (readyEnough && video.readyState >= 3) finish()
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
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

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
    if (!apiConfigured() || (kind !== 'films' && kind !== 'stills')) {
      extrasRatio = 1
      publish()
      return
    }
    try {
      if (kind === 'stills') {
        const items = await fetchMedia('stills')
        const urls = items.map((i) => i.url).filter(Boolean).slice(0, 6)
        if (!urls.length) {
          extrasRatio = 1
          publish()
          return
        }
        let done = 0
        await Promise.all(
          urls.map(async (url) => {
            await preloadImage(url)
            done += 1
            extrasRatio = done / urls.length
            publish()
          }),
        )
      } else {
        const items = await fetchMedia('films_short_forms')
        const urls = items.map((i) => i.url).filter(Boolean).slice(0, 4)
        if (!urls.length) {
          extrasRatio = 1
          publish()
          return
        }
        let done = 0
        await Promise.all(
          urls.map(async (url) => {
            const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url)
            if (isVideo) {
              await preloadVideo(url, () => {})
            } else {
              await preloadImage(url)
            }
            done += 1
            extrasRatio = done / urls.length
            publish()
          }),
        )
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
