import * as THREE from 'three'
import { PALETTES, type Project } from '../data/projects'
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

  projects.forEach((project, pi) => {
    const palette = project.palette ?? PALETTES[pi % PALETTES.length]
    for (let ti = 0; ti < tilesPerProject; ti++) {
      const { x, y } = cellOrigin(pi, ti)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, CELL_W, CELL_H)
      ctx.clip()
      ctx.translate(x, y)
      drawPlaceholder(ctx, CELL_W, CELL_H, project, pi, ti, palette)
      ctx.restore()
    }
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true

  // Swap in real thumbnails as they arrive.
  projects.forEach((project, pi) => {
    project.images?.forEach((src, ti) => {
      if (ti >= tilesPerProject) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const { x, y } = cellOrigin(pi, ti)
        drawCover(ctx, img, x, y, CELL_W, CELL_H)
        texture.needsUpdate = true
      }
      img.src = src
    })
  })

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
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.width - sw) / 2
  const sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/* ------------------------------------------------------------------------ */
/* Placeholder art. Six variants so each cluster reads as a mini case study. */
/* ------------------------------------------------------------------------ */

const SERIF = '"Instrument Serif", Georgia, serif'
const MONO = '"Roboto Mono", ui-monospace, monospace'
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif'

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  project: Project,
  projectIndex: number,
  tileIndex: number,
  [bg, fg, accent]: [string, string, string],
) {
  const rnd = mulberry32(projectIndex * 97 + tileIndex * 13 + 7)
  const variant = (tileIndex + projectIndex) % 6

  switch (variant) {
    case 0: {
      // Brand name, centred.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = fg
      ctx.font = `700 ${Math.round(h * 0.26)}px ${SANS}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(project.name, w / 2, h / 2)
      ctx.fillStyle = accent
      ctx.fillRect(w * 0.42, h * 0.72, w * 0.16, 3)
      break
    }
    case 1: {
      // Dot grid with a small category label.
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.globalAlpha = 0.65
      const step = 14
      for (let yy = 8; yy < h; yy += step)
        for (let xx = 8; xx < w; xx += step) {
          ctx.beginPath()
          ctx.arc(xx, yy, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      ctx.globalAlpha = 1
      ctx.fillStyle = bg
      ctx.fillRect(10, h - 32, w * 0.5, 22)
      ctx.fillStyle = fg
      ctx.font = `500 11px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(project.category.toUpperCase(), 18, h - 21)
      break
    }
    case 2: {
      // Mock website.
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, 18)
      ctx.fillStyle = accent
      ctx.fillRect(10, 6, 26, 6)
      ctx.fillStyle = bg
      ctx.globalAlpha = 0.9
      ctx.fillRect(14, 30, w * 0.55, 10)
      ctx.fillRect(14, 46, w * 0.4, 6)
      ctx.globalAlpha = 1
      ctx.fillStyle = accent
      ctx.fillRect(14, 60, 54, 16)
      const cardW = (w - 14 * 2 - 16) / 3
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = bg
        ctx.globalAlpha = 0.12 + i * 0.08
        ctx.fillRect(14 + i * (cardW + 8), h - 56, cardW, 44)
      }
      ctx.globalAlpha = 1
      break
    }
    case 3: {
      // Giant initial.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = accent
      ctx.font = `italic 400 ${Math.round(h * 1.25)}px ${SERIF}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(project.name[0], w / 2, h * 0.56)
      ctx.fillStyle = fg
      ctx.font = `500 10px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(project.name.toUpperCase(), 12, h - 12)
      break
    }
    case 4: {
      // Diagonal stripes with a badge.
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = accent
      ctx.lineWidth = 10
      ctx.globalAlpha = 0.85
      for (let i = -h; i < w + h; i += 28) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i + h, h)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const bw = w * 0.56
      const bh = 34
      ctx.fillStyle = fg
      ctx.fillRect((w - bw) / 2, (h - bh) / 2, bw, bh)
      ctx.fillStyle = bg
      ctx.font = `700 13px ${SANS}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(project.name.toUpperCase(), w / 2, h / 2 + 1)
      break
    }
    default: {
      // Big stat.
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      const n = Math.round(12 + rnd() * 88)
      const unit = ['K', 'M', '%', 'x'][Math.floor(rnd() * 4)]
      ctx.font = `400 ${Math.round(h * 0.6)}px ${SERIF}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${n}${unit}`, 14, h * 0.62)
      ctx.fillStyle = accent
      ctx.font = `500 10px ${MONO}`
      ctx.fillText(project.tagline.toUpperCase().slice(0, 28), 14, h - 14)
      break
    }
  }
}
