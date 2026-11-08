import * as THREE from 'three'
import { PALETTES, type Project } from './projects'
import { GLOBE } from './config'

export interface UvRect {
  x0: number
  x1: number
  /** v at the tile's top edge (flipY texture space). */
  vTop: number
  /** v at the tile's bottom edge. */
  vBottom: number
}

export interface Atlas {
  texture: THREE.CanvasTexture
  canvas: HTMLCanvasElement
  cellW: number
  cellH: number
  cols: number
  tilesPerProject: number
  rect(projectIndex: number, tileIndex: number): UvRect
  /** Lazily renders one atlas cell to a data URL (for the DOM overlay). */
  dataUrl(projectIndex: number, tileIndex: number): string
  /** Paint the latest video frames into atlas cells. Call once per R3F frame. */
  tick(): void
  dispose(): void
}

const CELL_W = 256
const CELL_H = Math.round((CELL_W * GLOBE.tileH) / GLOBE.tileW) // keep the tile aspect
const ATLAS_COLS = 16

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type VideoCell = {
  x: number
  y: number
  /** Solid matte behind the frame so each cluster keeps its colour identity. */
  matte: string
  accent: string
  /** Tile width / height on the sphere. */
  aspect: number
}

type VideoBinding = {
  video: HTMLVideoElement
  cells: VideoCell[]
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
  // Seek only once: every seek re-fires `canplay`, so seeking inside it loops forever.
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

export function buildAtlas(projects: Project[]): Atlas {
  const tilesPerProject = GLOBE.clusterCols * GLOBE.clusterRows
  const cellCount = projects.length * tilesPerProject
  const rows = Math.ceil(cellCount / ATLAS_COLS)

  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_COLS * CELL_W
  canvas.height = rows * CELL_H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = GLOBE.bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const cellOrigin = (projectIndex: number, tileIndex: number) => {
    const n = projectIndex * tilesPerProject + tileIndex
    return { x: (n % ATLAS_COLS) * CELL_W, y: Math.floor(n / ATLAS_COLS) * CELL_H }
  }

  const aspectOf = (project: Project, ti: number) => project.aspects?.[ti] ?? CELL_W / CELL_H

  projects.forEach((project, pi) => {
    const palette = project.palette ?? PALETTES[pi % PALETTES.length]
    const artOrder = variantOrder(project.artSeed ?? pi * 997)
    for (let ti = 0; ti < tilesPerProject; ti++) {
      const { x, y } = cellOrigin(pi, ti)
      // Draw in the tile's true proportions; the sphere geometry un-squeezes it.
      const lw = CELL_H * aspectOf(project, ti)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, CELL_W, CELL_H)
      ctx.clip()
      ctx.translate(x, y)
      ctx.scale(CELL_W / lw, 1)
      drawPlaceholder(ctx, lw, CELL_H, project, pi, ti, palette, artOrder[ti]!)
      ctx.restore()
    }
  })

  const texture = new THREE.CanvasTexture(canvas)
  // Dynamic video frames update every tick — mipmaps would stay stale and show
  // the initial placeholder art instead of the playing reels.
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  // Photo stills, cropped + washed into the board's hue family.
  projects.forEach((project, pi) => {
    if (!project.images) return
    const [matte, , accent] = project.palette ?? PALETTES[pi % PALETTES.length]!
    for (const [tileKey, src] of Object.entries(project.images)) {
      const ti = Number(tileKey)
      if (!src || ti < 0 || ti >= tilesPerProject) continue
      const img = new Image()
      img.onload = () => {
        const { x, y } = cellOrigin(pi, ti)
        drawCoverAspect(ctx, img, img.naturalWidth, img.naturalHeight, x, y, aspectOf(project, ti))
        washCell(ctx, x, y, matte, accent)
        texture.needsUpdate = true
      }
      img.src = src
    }
  })

  // Decoders are pooled per (clip, phase) so ~100 moving tiles need ~2 players per clip;
  // the phase split keeps neighbouring boards showing the same clip out of sync.
  const PHASES = 2
  const pool = new Map<string, VideoBinding>()
  projects.forEach((project, pi) => {
    if (!project.videos) return
    const [matte, , accent] = project.palette ?? PALETTES[pi % PALETTES.length]
    for (const [tileKey, src] of Object.entries(project.videos)) {
      const ti = Number(tileKey)
      if (!src || ti < 0 || ti >= tilesPerProject) continue
      const phase = (pi + ti) % PHASES
      const key = `${src}|${phase}`
      let binding = pool.get(key)
      if (!binding) {
        binding = { video: createLoopingVideo(src, phase * 3.3), cells: [] }
        pool.set(key, binding)
      }
      const { x, y } = cellOrigin(pi, ti)
      binding.cells.push({ x, y, matte, accent, aspect: aspectOf(project, ti) })
    }
  })
  const videoBindings = [...pool.values()]

  const W = canvas.width
  const H = canvas.height

  return {
    texture,
    canvas,
    cellW: CELL_W,
    cellH: CELL_H,
    cols: ATLAS_COLS,
    tilesPerProject,
    rect(projectIndex, tileIndex) {
      const { x, y } = cellOrigin(projectIndex, tileIndex)
      // Inset half a pixel so linear filtering never bleeds into the neighbour cell.
      const inset = 0.5
      return {
        x0: (x + inset) / W,
        x1: (x + CELL_W - inset) / W,
        vTop: 1 - (y + inset) / H,
        vBottom: 1 - (y + CELL_H - inset) / H,
      }
    },
    dataUrl(projectIndex, tileIndex) {
      const { x, y } = cellOrigin(projectIndex, tileIndex)
      const c = document.createElement('canvas')
      c.width = CELL_W
      c.height = CELL_H
      c.getContext('2d')!.drawImage(canvas, x, y, CELL_W, CELL_H, 0, 0, CELL_W, CELL_H)
      return c.toDataURL('image/jpeg', 0.85)
    },
    tick() {
      let dirty = false
      for (const { video, cells } of videoBindings) {
        if (video.readyState < 2 || !video.videoWidth) continue
        for (const { x, y, matte, accent, aspect } of cells) {
          drawCoverAspect(ctx, video, video.videoWidth, video.videoHeight, x, y, aspect)
          washCell(ctx, x, y, matte, accent)
        }
        dirty = true
      }
      if (dirty) texture.needsUpdate = true
    },
    dispose() {
      for (const { video } of videoBindings) {
        video.pause()
        video.removeAttribute('src')
        video.load()
        video.remove()
      }
      texture.dispose()
    },
  }
}

/** Centre-crop `media` to the tile's aspect, then fill the whole atlas cell. */
function drawCoverAspect(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  mw: number,
  mh: number,
  x: number,
  y: number,
  aspect: number,
) {
  if (!mw || !mh) return
  let sw = mw
  let sh = mw / aspect
  if (sh > mh) {
    sh = mh
    sw = mh * aspect
  }
  ctx.drawImage(media, (mw - sw) / 2, (mh - sh) / 2, sw, sh, x, y, CELL_W, CELL_H)
}

/** Pull footage into the board palette — keep luminance, replace hue/sat. */
function washCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  matte: string,
  accent: string,
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, CELL_W, CELL_H)
  ctx.clip()
  ctx.globalCompositeOperation = 'color'
  ctx.globalAlpha = 0.62
  ctx.fillStyle = accent
  ctx.fillRect(x, y, CELL_W, CELL_H)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 0.18
  ctx.fillStyle = matte
  ctx.fillRect(x, y, CELL_W, CELL_H)
  ctx.restore()
}

/* ------------------------------------------------------------------------ */
/* Still art — many variants, shuffled per board so clusters don't rhyme.   */
/* ------------------------------------------------------------------------ */

const SERIF = '"Instrument Serif", Georgia, serif'
const MONO = '"Roboto Mono", ui-monospace, monospace'
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif'
const VARIANT_COUNT = 16

function variantOrder(seed: number): number[] {
  const order = Array.from({ length: VARIANT_COUNT }, (_, i) => i)
  const rnd = mulberry32(seed)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  return order
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  project: Project,
  projectIndex: number,
  tileIndex: number,
  [bg, fg, accent]: [string, string, string],
  variant: number,
) {
  const rnd = mulberry32((project.artSeed ?? projectIndex * 97) + tileIndex * 131 + variant * 17)
  const word = project.name.split(/\s+/)[0] ?? project.name

  switch (variant % VARIANT_COUNT) {
    case 0: {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = fg
      ctx.font = `700 ${Math.round(h * 0.22)}px ${SANS}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(word.toUpperCase(), w / 2, h * 0.46)
      ctx.fillStyle = accent
      ctx.fillRect(w * 0.35, h * 0.62, w * 0.3, 4)
      break
    }
    case 1: {
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.globalAlpha = 0.55
      const step = 12 + Math.floor(rnd() * 8)
      for (let yy = 6; yy < h; yy += step)
        for (let xx = 6; xx < w; xx += step) {
          ctx.beginPath()
          ctx.arc(xx, yy, 1.4 + rnd(), 0, Math.PI * 2)
          ctx.fill()
        }
      ctx.globalAlpha = 1
      ctx.fillStyle = bg
      ctx.fillRect(10, h - 34, w * 0.55, 22)
      ctx.fillStyle = fg
      ctx.font = `500 11px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(project.category.toUpperCase(), 18, h - 23)
      break
    }
    case 2: {
      // Browser / site chrome.
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, 20)
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(14, 10, 3, 0, Math.PI * 2)
      ctx.arc(24, 10, 3, 0, Math.PI * 2)
      ctx.arc(34, 10, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = bg
      ctx.globalAlpha = 0.85
      ctx.fillRect(14, 34, w * 0.62, 12)
      ctx.fillRect(14, 52, w * 0.4, 8)
      ctx.globalAlpha = 1
      ctx.fillStyle = accent
      ctx.fillRect(14, 70, 58, 18)
      break
    }
    case 3: {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = accent
      ctx.font = `italic 400 ${Math.round(h * 1.15)}px ${SERIF}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(project.name[0] ?? 'K', w / 2, h * 0.55)
      ctx.fillStyle = fg
      ctx.font = `500 10px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(project.name.toUpperCase().slice(0, 18), 12, h - 12)
      break
    }
    case 4: {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = accent
      ctx.lineWidth = 8 + rnd() * 6
      ctx.globalAlpha = 0.9
      const step = 22 + rnd() * 16
      for (let i = -h; i < w + h; i += step) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + h, h)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const bw = w * 0.62
      const bh = 32
      ctx.fillStyle = fg
      ctx.fillRect((w - bw) / 2, (h - bh) / 2, bw, bh)
      ctx.fillStyle = bg
      ctx.font = `700 12px ${SANS}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(word.toUpperCase().slice(0, 14), w / 2, h / 2 + 1)
      break
    }
    case 5: {
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      const n = Math.round(8 + rnd() * 92)
      const unit = ['K', 'M', '%', 'x', 'hrs'][Math.floor(rnd() * 5)]
      ctx.font = `400 ${Math.round(h * 0.52)}px ${SERIF}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${n}${unit}`, 12, h * 0.58)
      ctx.fillStyle = accent
      ctx.font = `500 10px ${MONO}`
      ctx.fillText(project.tagline.toUpperCase().slice(0, 22), 12, h - 14)
      break
    }
    case 6: {
      // Phone mock.
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, w, h)
      const pw = w * 0.38
      const ph = h * 0.78
      const px = (w - pw) / 2
      const py = (h - ph) / 2
      ctx.fillStyle = bg
      ctx.fillRect(px, py, pw, ph)
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.15
      ctx.fillRect(px + 6, py + 18, pw - 12, ph * 0.22)
      ctx.fillRect(px + 6, py + ph * 0.4, pw - 12, 8)
      ctx.fillRect(px + 6, py + ph * 0.5, pw - 12, 8)
      ctx.globalAlpha = 1
      ctx.fillStyle = accent
      ctx.fillRect(px + 6, py + ph - 28, pw - 12, 14)
      break
    }
    case 7: {
      // Colour swatches.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      const cols = 3
      const rows = 2
      const pad = 10
      const gw = (w - pad * (cols + 1)) / cols
      const gh = (h - pad * (rows + 1)) / rows
      const tones = [accent, fg, bg, accent, fg, bg]
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = tones[(r * cols + c + projectIndex) % tones.length]!
          ctx.globalAlpha = 0.55 + ((r + c) % 3) * 0.15
          ctx.fillRect(pad + c * (gw + pad), pad + r * (gh + pad), gw, gh)
        }
      ctx.globalAlpha = 1
      break
    }
    case 8: {
      // Poster blocks.
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, w * 0.42, h)
      ctx.fillStyle = bg
      ctx.font = `700 ${Math.round(h * 0.16)}px ${SANS}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(word.toUpperCase().slice(0, 10), w * 0.48, h * 0.28)
      ctx.font = `500 10px ${MONO}`
      ctx.fillStyle = accent
      ctx.fillText(project.category.toUpperCase(), w * 0.48, h * 0.55)
      break
    }
    case 9: {
      // Soft orbs / illustration vibe.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(w * 0.35, h * 0.45, h * 0.28, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.arc(w * 0.62, h * 0.58, h * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = fg
      ctx.font = `500 11px ${MONO}`
      ctx.textAlign = 'left'
      ctx.fillText(project.tagline.toUpperCase().slice(0, 16), 12, h - 14)
      break
    }
    case 10: {
      // Horizontal rules / editorial.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 1
      for (let y = 18; y < h - 10; y += 10) {
        ctx.beginPath()
        ctx.moveTo(12, y)
        ctx.lineTo(w - 12, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = accent
      ctx.fillRect(12, 28, w * 0.5, 10)
      ctx.fillStyle = fg
      ctx.font = `700 14px ${SANS}`
      ctx.textAlign = 'left'
      ctx.fillText(word.toUpperCase().slice(0, 12), 12, h * 0.62)
      break
    }
    case 12: {
      // Gradient poster.
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, accent)
      g.addColorStop(1, bg)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = fg
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(w * (0.3 + rnd() * 0.4), h * 0.4, h * 0.22, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.font = `italic 400 ${Math.round(h * 0.2)}px ${SERIF}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(word, 12, h - 14)
      break
    }
    case 13: {
      // Repeating wordmark.
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      const size = Math.round(h * 0.2)
      ctx.font = `800 ${size}px ${SANS}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const label = `${word.toUpperCase()} `
      for (let row = 0, y = -size * 0.2; y < h; row++, y += size * 0.95) {
        ctx.globalAlpha = row % 2 ? 0.35 : 1
        const shift = row % 2 ? -size * 1.6 : 0
        ctx.fillText(label.repeat(6), shift, y)
      }
      ctx.globalAlpha = 1
      break
    }
    case 14: {
      // Results card with bars.
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.font = `500 10px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('VIEWS / WEEK', 12, 12)
      const bars = 7
      const bw = (w - 24) / bars - 5
      for (let b = 0; b < bars; b++) {
        const bh = h * (0.18 + rnd() * 0.5)
        ctx.fillStyle = b === bars - 2 ? accent : bg
        ctx.globalAlpha = b === bars - 2 ? 1 : 0.75
        ctx.fillRect(12 + b * (bw + 5), h - 12 - bh, bw, bh)
      }
      ctx.globalAlpha = 1
      break
    }
    case 15: {
      // Icon grid.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      const cols = Math.max(3, Math.round(w / 46))
      const rows = 3
      const cw = w / cols
      const ch = h / rows
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const cx = c * cw + cw / 2
          const cy = r * ch + ch / 2
          const s = Math.min(cw, ch) * 0.28
          ctx.fillStyle = (r + c) % 3 === 0 ? accent : fg
          ctx.globalAlpha = (r + c) % 3 === 0 ? 1 : 0.5
          const kind = Math.floor(rnd() * 3)
          ctx.beginPath()
          if (kind === 0) ctx.arc(cx, cy, s, 0, Math.PI * 2)
          else if (kind === 1) ctx.rect(cx - s, cy - s, s * 2, s * 2)
          else {
            ctx.moveTo(cx, cy - s)
            ctx.lineTo(cx + s, cy + s)
            ctx.lineTo(cx - s, cy + s)
            ctx.closePath()
          }
          ctx.fill()
        }
      ctx.globalAlpha = 1
      break
    }
    default: {
      // Split diagonal.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(w, 0)
      ctx.lineTo(0, h)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = fg
      ctx.font = `700 ${Math.round(h * 0.2)}px ${SANS}`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(project.name[0] ?? 'K', w - 14, h - 14)
      break
    }
  }
}
