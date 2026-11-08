import { GLOBE } from './config'

/**
 * A tile's place on the sphere, expressed in surface units (arc length in px
 * from the (lon 0, lat 0) point). u runs along the equator, v toward the poles.
 */
export interface TileSlot {
  id: string
  clusterIndex: number
  projectIndex: number
  tileIndex: number
  u: number
  v: number
  w: number
  h: number
}

export interface ClusterSlot {
  clusterIndex: number
  projectIndex: number
  u: number
  v: number
  shape: string
}

export interface Layout {
  tiles: TileSlot[]
  clusters: ClusterSlot[]
}

type TileDef = {
  tileIndex: number
  ou: number
  ov: number
  w: number
  h: number
}

/**
 * Every cluster occupies the SAME outer rectangle (3×2 unit cells), evenly
 * spaced on the sphere — like Griflan Labs. Asymmetry lives only inside:
 * different ways to subdivide that fixed frame into rectangles.
 */
function packFrame(shape: string, W: number, H: number, G: number): TileDef[] {
  const CW = 3 * W + 2 * G
  const CH = 2 * H + G

  /** Place a tile covering [col, row] with span in unit cells (origin = frame centre). */
  const cell = (
    tileIndex: number,
    col: number,
    row: number,
    colSpan: number,
    rowSpan: number,
  ): TileDef => {
    const w = colSpan * W + (colSpan - 1) * G
    const h = rowSpan * H + (rowSpan - 1) * G
    const ou = -CW / 2 + col * (W + G) + w / 2
    const ov = CH / 2 - row * (H + G) - h / 2
    return { tileIndex, ou, ov, w, h }
  }

  switch (shape) {
    case 'leftTall':
      // Tall media left, 2×2 collage right — classic case-study board.
      return [
        cell(0, 0, 0, 1, 2),
        cell(1, 1, 0, 1, 1),
        cell(2, 2, 0, 1, 1),
        cell(3, 1, 1, 1, 1),
        cell(5, 2, 1, 1, 1),
      ]
    case 'rightTall':
      return [
        cell(1, 0, 0, 1, 1),
        cell(2, 1, 0, 1, 1),
        cell(0, 2, 0, 1, 2),
        cell(3, 0, 1, 1, 1),
        cell(4, 1, 1, 1, 1),
      ]
    case 'topBanner':
      // Full-width hero strip + three equal below.
      return [
        cell(0, 0, 0, 3, 1),
        cell(3, 0, 1, 1, 1),
        cell(4, 1, 1, 1, 1),
        cell(5, 2, 1, 1, 1),
      ]
    case 'bottomBanner':
      return [
        cell(0, 0, 0, 1, 1),
        cell(1, 1, 0, 1, 1),
        cell(2, 2, 0, 1, 1),
        cell(5, 0, 1, 3, 1),
      ]
    case 'topWide':
      // Wide top-left + one top-right, three below.
      return [
        cell(0, 0, 0, 2, 1),
        cell(2, 2, 0, 1, 1),
        cell(3, 0, 1, 1, 1),
        cell(4, 1, 1, 1, 1),
        cell(5, 2, 1, 1, 1),
      ]
    case 'bigLeft':
      // 2×2 hero + two stacked on the right.
      return [
        cell(0, 0, 0, 2, 2),
        cell(2, 2, 0, 1, 1),
        cell(5, 2, 1, 1, 1),
      ]
    case 'bigRight':
      return [
        cell(1, 0, 0, 1, 1),
        cell(0, 1, 0, 2, 2),
        cell(3, 0, 1, 1, 1),
      ]
    case 'quad': {
      // Four equal tiles in a 2×2 — same outer frame, larger panes.
      const qw = (CW - G) / 2
      const qh = (CH - G) / 2
      return [
        { tileIndex: 0, ou: -CW / 2 + qw / 2, ov: CH / 2 - qh / 2, w: qw, h: qh },
        { tileIndex: 2, ou: CW / 2 - qw / 2, ov: CH / 2 - qh / 2, w: qw, h: qh },
        { tileIndex: 3, ou: -CW / 2 + qw / 2, ov: -CH / 2 + qh / 2, w: qw, h: qh },
        { tileIndex: 5, ou: CW / 2 - qw / 2, ov: -CH / 2 + qh / 2, w: qw, h: qh },
      ]
    }
    case 'grid32':
    default:
      return [
        cell(0, 0, 0, 1, 1),
        cell(1, 1, 0, 1, 1),
        cell(2, 2, 0, 1, 1),
        cell(3, 0, 1, 1, 1),
        cell(4, 1, 1, 1, 1),
        cell(5, 2, 1, 1, 1),
      ]
  }
}

/** Cycle so neighbours rarely share the same internal packing. */
const SHAPES = [
  'grid32',
  'leftTall',
  'topBanner',
  'bigLeft',
  'quad',
  'rightTall',
  'topWide',
  'bottomBanner',
  'bigRight',
  'leftTall',
  'grid32',
  'quad',
  'topBanner',
  'bigLeft',
] as const

export function shapeForCluster(clusterIndex: number): string {
  return SHAPES[clusterIndex % SHAPES.length]
}

/** Tiles inside a board, largest first — used to decide where motion/photos go. */
export function boardTiles(clusterIndex: number): { tileIndex: number; aspect: number; area: number }[] {
  const { tileW, tileH, tileGap } = GLOBE
  return packFrame(shapeForCluster(clusterIndex), tileW, tileH, tileGap)
    .map((d) => ({ tileIndex: d.tileIndex, aspect: d.w / d.h, area: d.w * d.h }))
    .sort((a, b) => b.area - a.area)
}

/**
 * Regular staggered grid of equal cluster frames; only the packing inside
 * each frame varies (Griflan Labs: same section size/spacing, asymmetric guts).
 */
export function buildLayout(projectCount: number): Layout {
  const { gridCols, gridRows, pitchX, pitchY, tileW, tileH, tileGap, staggerOddRows } = GLOBE

  const tiles: TileSlot[] = []
  const clusters: ClusterSlot[] = []

  let clusterIndex = 0
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const stagger = staggerOddRows && r % 2 === 1 ? pitchX / 2 : 0
      const u = c * pitchX + stagger
      const v = (r - (gridRows - 1) / 2) * pitchY
      const projectIndex = clusterIndex % projectCount
      const shape = shapeForCluster(clusterIndex)

      clusters.push({ clusterIndex, projectIndex, u, v, shape })

      for (const def of packFrame(shape, tileW, tileH, tileGap)) {
        tiles.push({
          id: `${clusterIndex}-${def.tileIndex}`,
          clusterIndex,
          projectIndex,
          tileIndex: def.tileIndex,
          u: u + def.ou,
          v: v + def.ov,
          w: def.w,
          h: def.h,
        })
      }
      clusterIndex++
    }
  }

  return { tiles, clusters }
}
