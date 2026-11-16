import * as THREE from 'three'

/**
 * Shared HTMLVideoElement / Image + Texture pool for globe tiles.
 * Stills are decoded into ~640px bitmaps so multi-megapixel CDN originals
 * never hit the GPU. Video downloads stay gated.
 */
export interface VideoPool {
  /** Texture for a clip or still. `phase` offsets video start so neighbours don't sync. */
  textureFor(src: string, phase?: number): THREE.Texture
  /** Current media width/height aspect (0 until metadata). */
  aspectFor(src: string, phase?: number): number
  tick(): void
  dispose(): void
}

type Entry = {
  kind: 'video' | 'image'
  video?: HTMLVideoElement
  texture: THREE.Texture
  aspect: number
}

/** Max concurrent HQ video downloads from the CDN. */
const MAX_CONCURRENT_VIDEO_LOADS = 3
/** Max concurrent still fetches (tiles are small; allow a wider fan-out). */
const MAX_CONCURRENT_IMAGE_LOADS = 12
/** GPU long-edge for still textures — Griflan-sized boards, not camera files. */
const IMAGE_GPU_MAX_EDGE = 640

function isImageSrc(src: string) {
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(src)
}

function createLoadGate(limit: number) {
  let active = 0
  const queue: Array<() => void> = []

  const pump = () => {
    while (active < limit && queue.length) {
      const job = queue.shift()!
      active += 1
      job()
    }
  }

  return {
    schedule(start: () => void) {
      queue.push(start)
      pump()
    },
    release() {
      active = Math.max(0, active - 1)
      pump()
    },
  }
}

function createLoopingVideo(
  src: string,
  startOffset: number,
  gate: ReturnType<typeof createLoadGate>,
): HTMLVideoElement {
  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.playsInline = true
  video.preload = 'none'
  video.setAttribute('playsinline', '')
  video.setAttribute('muted', '')
  if (/^https?:\/\//i.test(src)) video.crossOrigin = 'anonymous'
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

  let seeked = startOffset === 0
  let released = false
  const release = () => {
    if (released) return
    released = true
    gate.release()
  }

  const tryPlay = () => {
    if (!seeked && Number.isFinite(video.duration) && video.duration > 0.2) {
      seeked = true
      video.currentTime = startOffset % video.duration
    }
    if (video.paused) void video.play().catch(() => {})
  }

  video.addEventListener('loadedmetadata', tryPlay)
  video.addEventListener('canplay', () => {
    release()
    tryPlay()
  })
  video.addEventListener('error', release)

  gate.schedule(() => {
    video.preload = 'auto'
    video.src = src
    video.load()
    tryPlay()
  })

  return video
}

function localStillFallback(src: string) {
  if (src.startsWith('/media/stills/still-')) return null
  let h = 0
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0
  return `/media/stills/still-${(Math.abs(h) % 42) + 1}.jpg`
}

async function decodeImageTile(src: string): Promise<{ bitmap: ImageBitmap; aspect: number }> {
  const res = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'force-cache' })
  if (!res.ok) {
    const fb = localStillFallback(src)
    if (fb) return decodeImageTile(fb)
    throw new Error(`image ${res.status}`)
  }
  const blob = await res.blob()

  // Prefer browser resize during decode (avoids uploading 11MP to GPU).
  if (typeof createImageBitmap === 'function') {
    try {
      const probe = await createImageBitmap(blob)
      const w = probe.width
      const h = probe.height
      const aspect = w > 0 && h > 0 ? w / h : 1
      const long = Math.max(w, h)
      if (long > IMAGE_GPU_MAX_EDGE) {
        const scale = IMAGE_GPU_MAX_EDGE / long
        probe.close()
        const bitmap = await createImageBitmap(blob, {
          resizeWidth: Math.max(1, Math.round(w * scale)),
          resizeHeight: Math.max(1, Math.round(h * scale)),
          resizeQuality: 'high',
        })
        return { bitmap, aspect }
      }
      return { bitmap: probe, aspect }
    } catch {
      /* fall through */
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('img'))
      el.src = url
    })
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight)
    const long = Math.max(img.naturalWidth, img.naturalHeight)
    const scale = long > IMAGE_GPU_MAX_EDGE ? IMAGE_GPU_MAX_EDGE / long : 1
    const cw = Math.max(1, Math.round(img.naturalWidth * scale))
    const ch = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d')
    ctx.drawImage(img, 0, 0, cw, ch)
    const bitmap = await createImageBitmap(canvas)
    return { bitmap, aspect }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function buildVideoPool(): VideoPool {
  const map = new Map<string, Entry>()
  const videoGate = createLoadGate(MAX_CONCURRENT_VIDEO_LOADS)
  const imageGate = createLoadGate(MAX_CONCURRENT_IMAGE_LOADS)

  const keyOf = (src: string) => src

  const ensure = (src: string, phase = 0): Entry => {
    const key = keyOf(src)
    let entry = map.get(key)
    if (entry) return entry

    if (isImageSrc(src)) {
      const texture = new THREE.Texture()
      texture.colorSpace = THREE.SRGBColorSpace
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = 4
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
      entry = { kind: 'image', texture, aspect: 0 }
      map.set(key, entry)

      imageGate.schedule(() => {
        void decodeImageTile(src)
          .then(({ bitmap, aspect }) => {
            const e = map.get(key)
            if (!e) {
              bitmap.close()
              imageGate.release()
              return
            }
            e.aspect = aspect
            e.texture.image = bitmap
            e.texture.needsUpdate = true
            imageGate.release()
          })
          .catch(() => {
            imageGate.release()
          })
      })

      return entry
    }

    const video = createLoopingVideo(src, phase * 3.3, videoGate)
    const texture = new THREE.VideoTexture(video)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 4
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping

    entry = { kind: 'video', video, texture, aspect: 0 }
    const syncAspect = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        entry!.aspect = video.videoWidth / video.videoHeight
      }
    }
    video.addEventListener('loadedmetadata', syncAspect)
    video.addEventListener('loadeddata', syncAspect)
    syncAspect()

    map.set(key, entry)
    return entry
  }

  return {
    textureFor(src, phase = 0) {
      return ensure(src, phase).texture
    },
    aspectFor(src, phase = 0) {
      return ensure(src, phase).aspect
    },
    tick() {
      for (const entry of map.values()) {
        if (entry.kind !== 'video' || !entry.video) continue
        const { video, texture } = entry
        if (video.readyState < 2) continue
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          entry.aspect = video.videoWidth / video.videoHeight
        }
        texture.needsUpdate = true
      }
    },
    dispose() {
      for (const { video, texture } of map.values()) {
        const img = texture.image
        texture.dispose()
        if (img && typeof (img as ImageBitmap).close === 'function') {
          try {
            ;(img as ImageBitmap).close()
          } catch {
            /* ignore */
          }
        }
        if (video) {
          video.pause()
          video.removeAttribute('src')
          video.load()
          video.remove()
        }
      }
      map.clear()
    },
  }
}
