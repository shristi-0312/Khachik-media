import * as THREE from 'three'

/**
 * Shared HTMLVideoElement / Image + Texture pool for globe tiles.
 * Videos stay native-resolution VideoTextures; stills use TextureLoader.
 *
 * Downloads are capped so the globe does not fan out dozens of HQ CDN streams
 * at once (which starves the hero / films grids).
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
const MAX_CONCURRENT_VIDEO_LOADS = 4

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
  video.crossOrigin = 'anonymous'
  // Keep element in the document so Safari will decode frames for WebGL.
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

export function buildVideoPool(): VideoPool {
  const map = new Map<string, Entry>()
  const gate = createLoadGate(MAX_CONCURRENT_VIDEO_LOADS)
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')

  // One element per unique CDN URL — phase only affects start offset for new entries.
  const keyOf = (src: string) => src

  const ensure = (src: string, phase = 0): Entry => {
    const key = keyOf(src)
    let entry = map.get(key)
    if (entry) return entry

    if (isImageSrc(src)) {
      const texture = loader.load(
        src,
        (tex) => {
          const img = tex.image as HTMLImageElement | undefined
          if (img?.naturalWidth && img?.naturalHeight) {
            const e = map.get(key)
            if (e) e.aspect = img.naturalWidth / img.naturalHeight
          }
          tex.needsUpdate = true
        },
      )
      texture.colorSpace = THREE.SRGBColorSpace
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = 8
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
      entry = { kind: 'image', texture, aspect: 0 }
      map.set(key, entry)
      return entry
    }

    const video = createLoopingVideo(src, phase * 3.3, gate)
    const texture = new THREE.VideoTexture(video)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 8
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
        texture.dispose()
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
