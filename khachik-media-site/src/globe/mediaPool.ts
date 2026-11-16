import * as THREE from 'three'
import { FIELD } from './config'
import { localStandIn } from './media'

/** A picture a board can draw. `ready` flips once there are pixels behind it. */
export interface PoolTexture {
  texture: THREE.Texture
  /** width / height — 0 until known. */
  aspect: number
  ready: boolean
  failed: boolean
}

export interface MediaPool {
  /**
   * Download and decode a still (shared per URL). `wanted` is asked when the
   * download's turn comes; answering false skips it and resolves null.
   */
  loadImage(src: string, wanted?: () => boolean): Promise<PoolTexture | null>
  /** A reel's texture. Nothing is downloaded until the reel is made live. */
  video(src: string): PoolTexture
  /**
   * One frame of a reel as a still (shared per URL), taken from the start of
   * the file — what its board shows whenever the reel itself is not running.
   * Resolves null if the frame cannot be had.
   */
  poster(src: string): Promise<PoolTexture | null>
  /** The reels that should be playing now. Everything else is paused, then unloaded. */
  setLive(srcs: readonly string[]): void
  /**
   * Send one waiting still to the GPU. Called once a frame, so pictures are
   * uploaded a few ms at a time while idle instead of all at once on the frame
   * a drag first brings them into view.
   */
  warm(renderer: THREE.WebGLRenderer): void
  setAnisotropy(n: number): void
  dispose(): void
}

interface VideoEntry extends PoolTexture {
  src: string
  el: HTMLVideoElement
  live: boolean
  loaded: boolean
  lastLive: number
}

/** Stills are drawn a few hundred px wide; anything larger is shrunk at decode. */
const MAX_STILL_EDGE = 1024
/** Poster frames: longest edge, where in the reel they are taken, and how long to wait. */
const POSTER_EDGE = 640
const POSTER_AT_SEC = 0.5
const POSTER_TIMEOUT_MS = 9000

function gate(limit: number) {
  let active = 0
  const queue: Array<() => Promise<void>> = []
  const pump = () => {
    while (active < limit && queue.length) {
      active += 1
      void queue.shift()!().finally(() => {
        active -= 1
        pump()
      })
    }
  }
  return (job: () => Promise<void>) => {
    queue.push(job)
    pump()
  }
}

async function decodeStill(src: string): Promise<{ image: ImageBitmap | HTMLImageElement; aspect: number }> {
  const res = await fetch(src, { credentials: 'omit', cache: 'force-cache' })
  if (!res.ok) throw new Error(`still ${res.status}`)
  const blob = await res.blob()
  // A missing file on a SPA host answers 200 with the app shell.
  if (blob.type && !blob.type.startsWith('image/')) throw new Error('not an image')

  if (typeof createImageBitmap === 'function') {
    let bitmap = await createImageBitmap(blob)
    const edge = Math.max(bitmap.width, bitmap.height)
    const aspect = bitmap.width / Math.max(1, bitmap.height)
    if (edge > MAX_STILL_EDGE) {
      const k = MAX_STILL_EDGE / edge
      const small = await createImageBitmap(blob, {
        resizeWidth: Math.max(1, Math.round(bitmap.width * k)),
        resizeHeight: Math.max(1, Math.round(bitmap.height * k)),
        resizeQuality: 'high',
      })
      bitmap.close()
      bitmap = small
    }
    return { image: bitmap, aspect }
  }

  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { image: img, aspect: img.naturalWidth / Math.max(1, img.naturalHeight) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function stillTexture(anisotropy: number) {
  const t = new THREE.Texture()
  // Rows are stored top-first (ImageBitmap ignores flipY); the board shader's
  // uv has its origin top-left to match.
  t.flipY = false
  t.premultiplyAlpha = false
  // Display values in, display values out — see shaders.ts.
  t.colorSpace = THREE.NoColorSpace
  // Boards are squeezed hard toward the pole; mips + anisotropy keep them from shimmering.
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.anisotropy = anisotropy
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

function reelElement(src: string) {
  const el = document.createElement('video')
  el.muted = true
  el.defaultMuted = true
  el.loop = true
  el.playsInline = true
  el.preload = 'none'
  el.setAttribute('playsinline', '')
  el.setAttribute('muted', '')
  if (/^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)) {
    el.crossOrigin = 'anonymous'
  }
  // Attached but out of sight: some browsers will not decode a detached video.
  Object.assign(el.style, {
    position: 'fixed',
    left: '-9999px',
    top: '0',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
  })
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  document.body.appendChild(el)
  return el
}

/**
 * Play a reel just far enough to have a picture, copy it, and let the file go.
 * (Played rather than only seeked: some browsers decode nothing for a muted
 * inline video until it runs.)
 */
function captureFrame(src: string) {
  return new Promise<{ image: HTMLCanvasElement; aspect: number }>((resolve, reject) => {
    const el = reelElement(src)
    el.loop = false
    el.preload = 'auto'

    let done = false
    const finish = (settle: () => void) => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      settle()
      el.pause()
      el.removeAttribute('src')
      el.load()
      el.remove()
    }
    const timer = window.setTimeout(
      () => finish(() => reject(new Error('poster timed out'))),
      POSTER_TIMEOUT_MS,
    )

    let aim = 0
    const grab = () => {
      if (done || el.readyState < 2 || el.videoWidth <= 0 || el.videoHeight <= 0) return
      if (el.currentTime < aim * 0.6) return
      const k = Math.min(1, POSTER_EDGE / Math.max(el.videoWidth, el.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(el.videoWidth * k))
      canvas.height = Math.max(1, Math.round(el.videoHeight * k))
      const ctx = canvas.getContext('2d')
      if (!ctx) return finish(() => reject(new Error('no 2d context')))
      try {
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
        // Throws if the frame came from another origin without CORS.
        ctx.getImageData(0, 0, 1, 1)
      } catch (err) {
        return finish(() => reject(err instanceof Error ? err : new Error('poster unreadable')))
      }
      const aspect = el.videoWidth / el.videoHeight
      finish(() => resolve({ image: canvas, aspect }))
    }

    el.addEventListener('loadedmetadata', () => {
      const length = Number.isFinite(el.duration) ? el.duration : 0
      aim = Math.min(POSTER_AT_SEC, length / 2)
      if (aim > 0) el.currentTime = aim
      void el.play().catch(() => {})
    })
    for (const name of ['loadeddata', 'seeked', 'canplay', 'timeupdate', 'playing']) {
      el.addEventListener(name, grab)
    }
    el.addEventListener('error', () => finish(() => reject(new Error('poster failed to load'))))

    el.src = src
    el.load()
  })
}

export function createMediaPool(): MediaPool {
  const stills = new Map<string, Promise<PoolTexture | null>>()
  const posters = new Map<string, Promise<PoolTexture | null>>()
  const stillTextures = new Set<PoolTexture>()
  /** Decoded, not yet on the GPU. */
  const fresh: THREE.Texture[] = []
  const reels = new Map<string, VideoEntry>()
  const schedule = gate(FIELD.imageConcurrency)
  // One at a time: each holds a decoder and a connection while it runs.
  const schedulePoster = gate(1)
  let anisotropy = 8
  let disposed = false

  const loadStill = (src: string, wanted?: () => boolean) =>
    new Promise<PoolTexture | null>((resolve) => {
      schedule(async () => {
        if (disposed || (wanted && !wanted())) return resolve(null)

        let decoded: Awaited<ReturnType<typeof decodeStill>> | null = null
        try {
          decoded = await decodeStill(src)
        } catch {
          const standIn = localStandIn(src)
          if (standIn) decoded = await decodeStill(standIn).catch(() => null)
        }

        if (!decoded || disposed) {
          if (decoded && 'close' in decoded.image) decoded.image.close()
          return resolve(null)
        }

        const texture = stillTexture(anisotropy)
        texture.image = decoded.image
        texture.needsUpdate = true
        const entry: PoolTexture = { texture, aspect: decoded.aspect, ready: true, failed: false }
        stillTextures.add(entry)
        fresh.push(texture)
        resolve(entry)
      })
    })

  const unload = (e: VideoEntry) => {
    e.el.pause()
    e.el.removeAttribute('src')
    e.el.load()
    e.live = false
    e.loaded = false
    // The last frame stays on the GPU, which is all the board needs to
    // dissolve back to the reel's poster.
    e.ready = false
  }

  return {
    loadImage(src, wanted) {
      let p = stills.get(src)
      if (!p) {
        p = loadStill(src, wanted)
        stills.set(src, p)
        // A skipped download may be asked for again later.
        void p.then((t) => {
          if (!t) stills.delete(src)
        })
      }
      return p
    },

    video(src) {
      let e = reels.get(src)
      if (e) return e

      const el = reelElement(src)
      const texture = new THREE.VideoTexture(el)
      texture.flipY = false
      texture.colorSpace = THREE.NoColorSpace
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping

      const entry: VideoEntry = {
        src,
        el,
        texture,
        aspect: 0,
        ready: false,
        failed: false,
        live: false,
        loaded: false,
        lastLive: 0,
      }
      e = entry

      const sync = () => {
        if (!entry.loaded || el.videoWidth <= 0 || el.videoHeight <= 0) return
        entry.aspect = el.videoWidth / el.videoHeight
        if (el.readyState >= 2) entry.ready = true
      }
      el.addEventListener('loadedmetadata', sync)
      el.addEventListener('loadeddata', sync)
      el.addEventListener('playing', sync)
      el.addEventListener('error', () => {
        if (!entry.loaded) return
        entry.failed = true
        entry.ready = false
        entry.live = false
      })

      reels.set(src, entry)
      return entry
    },

    poster(src) {
      let p = posters.get(src)
      if (!p) {
        p = new Promise<PoolTexture | null>((resolve) => {
          schedulePoster(async () => {
            if (disposed) return resolve(null)
            const frame = await captureFrame(src).catch(() => null)
            if (!frame || disposed) return resolve(null)

            const texture = stillTexture(anisotropy)
            texture.image = frame.image
            texture.needsUpdate = true
            const entry: PoolTexture = { texture, aspect: frame.aspect, ready: true, failed: false }
            stillTextures.add(entry)
            fresh.push(texture)
            resolve(entry)
          })
        })
        posters.set(src, p)
      }
      return p
    },

    setLive(srcs) {
      const now = performance.now()
      for (const e of reels.values()) {
        const want = srcs.includes(e.src) && !e.failed
        if (want) {
          if (!e.loaded) {
            e.loaded = true
            e.el.preload = 'auto'
            e.el.src = e.src
            e.el.load()
          }
          if (!e.live || e.el.paused) void e.el.play().catch(() => {})
          e.live = true
          e.lastLive = now
        } else if (e.live) {
          e.el.pause()
          e.live = false
          e.lastLive = now
        }
      }

      // Keep a few recently-paused reels buffered so coming back is instant;
      // unload the rest so they stop holding a decoder and a connection.
      const warm = [...reels.values()]
        .filter((e) => e.loaded && !e.live)
        .sort((a, b) => b.lastLive - a.lastLive)
      for (const e of warm.slice(FIELD.maxWarmVideos)) unload(e)
    },

    warm(renderer) {
      const texture = fresh.shift()
      if (texture && !disposed) renderer.initTexture(texture)
    },

    setAnisotropy(n) {
      anisotropy = Math.max(1, Math.min(8, n))
      for (const e of stillTextures) {
        if (e.texture.anisotropy === anisotropy) continue
        e.texture.anisotropy = anisotropy
        e.texture.needsUpdate = true
      }
    },

    dispose() {
      disposed = true
      for (const e of stillTextures) {
        const image = e.texture.image as ImageBitmap | HTMLImageElement | null
        e.texture.dispose()
        if (image && 'close' in image) image.close()
      }
      stillTextures.clear()
      fresh.length = 0
      stills.clear()
      posters.clear()
      for (const e of reels.values()) {
        e.texture.dispose()
        e.el.pause()
        e.el.removeAttribute('src')
        e.el.load()
        e.el.remove()
      }
      reels.clear()
    },
  }
}
