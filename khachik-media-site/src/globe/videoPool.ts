import * as THREE from 'three'

/**
 * Shared HTMLVideoElement + VideoTexture pool.
 * Large 3×3 / 2×3 frames need native video resolution — painting into a
 * canvas atlas was crushing 720p down to ~384px and looking soft on screen.
 */
export interface VideoPool {
  /** Texture for a clip. `phase` offsets start time so neighbours don't sync. */
  textureFor(src: string, phase?: number): THREE.VideoTexture
  /** Current video width/height aspect (0 until metadata). */
  aspectFor(src: string, phase?: number): number
  tick(): void
  dispose(): void
}

type Entry = {
  video: HTMLVideoElement
  texture: THREE.VideoTexture
  aspect: number
}

function createLoopingVideo(src: string, startOffset = 0): HTMLVideoElement {
  const video = document.createElement('video')
  video.src = src
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.playsInline = true
  video.preload = 'auto'
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
  const tryPlay = () => {
    if (!seeked && Number.isFinite(video.duration) && video.duration > 0.2) {
      seeked = true
      video.currentTime = startOffset % video.duration
    }
    if (video.paused) void video.play().catch(() => {})
  }
  video.addEventListener('loadedmetadata', tryPlay)
  video.addEventListener('canplay', tryPlay)
  tryPlay()
  return video
}

export function buildVideoPool(): VideoPool {
  const map = new Map<string, Entry>()

  const keyOf = (src: string, phase = 0) => `${src}|${phase}`

  const ensure = (src: string, phase = 0): Entry => {
    const key = keyOf(src, phase)
    let entry = map.get(key)
    if (entry) return entry

    const video = createLoopingVideo(src, phase * 3.3)
    const texture = new THREE.VideoTexture(video)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 8
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
    // flipY true (default) matches our tile UVs (v=0 bottom → v=1 top).

    entry = { video, texture, aspect: 0 }
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
      for (const { video, texture, aspect } of map.values()) {
        if (video.readyState < 2) continue
        if (video.videoWidth > 0 && aspect === 0) {
          // aspect updated via ensure's entry — find and set
        }
        texture.needsUpdate = true
      }
      // Keep aspect fields fresh.
      for (const entry of map.values()) {
        const { video } = entry
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          entry.aspect = video.videoWidth / video.videoHeight
        }
      }
    },
    dispose() {
      for (const { video, texture } of map.values()) {
        texture.dispose()
        video.pause()
        video.removeAttribute('src')
        video.load()
        video.remove()
      }
      map.clear()
    },
  }
}
