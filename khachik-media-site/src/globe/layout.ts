import { GLOBE, clusterPitch } from './config'

/**
 * A tile's place on the sphere, expressed in surface units (arc length in px
 * from the (lon 0, lat 0) point). u runs along the equator, v toward the poles.
 * `u`/`v` are the tile centre; geometry expands ±w/2, ±h/2.
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
  orientation: 'horizontal' | 'vertical'
}

export interface ClusterSlot {
  clusterIndex: number
  projectIndex: number
  u: number
  v: number
  orientation: 'horizontal' | 'vertical'
  shape: string
}

export interface Layout {
  tiles: TileSlot[]
  clusters: ClusterSlot[]
}

export function orientationForCluster(clusterIndex: number): 'horizontal' | 'vertical' {
  return clusterIndex % 2 === 0 ? 'horizontal' : 'vertical'
}

/**
 * Frame size in surface units. Edges always land on lattice lines
 * (integer multiples of tileW / tileH).
 *
 * Slot is a 3×3 cell block. Horizontal fills all 3×3.
 * Vertical fills 2×3, left-aligned in the slot (empty 1-col gutter on the right)
 * so both left and right edges sit on meridians.
 */
function singleVideoFrame(orientation: 'horizontal' | 'vertical') {
  const { tileW: W, tileH: H, clusterCols, clusterRows } = GLOBE
  const slotW = clusterCols * W
  const slotH = clusterRows * H

  if (orientation === 'horizontal') {
    return { w: slotW, h: slotH, du: 0, dv: 0 }
  }
  // 2×3 — left-aligned in the 3-col slot (edges on lattice).
  const w = 2 * W
  const h = slotH
  // Slot centre is at +1.5W from left; 2-wide left-aligned centre is at +1W.
  return { w, h, du: -0.5 * W, dv: 0 }
}

/** Kept for projects.ts compatibility — one tile, aspect of H or V frame. */
export function boardTiles(clusterIndex: number): { tileIndex: number; aspect: number; area: number }[] {
  const orientation = orientationForCluster(clusterIndex)
  const { w, h } = singleVideoFrame(orientation)
  return [{ tileIndex: 0, aspect: w / h, area: w * h }]
}

export function shapeForCluster(clusterIndex: number): string {
  return orientationForCluster(clusterIndex)
}

/**
 * Regular staggered grid of equal 3×3 slots. Slot centres sit on half-cell
 * lattice points so a 3-odd-wide frame has edges on meridians/parallels.
 * Odd clusters: vertical 2×3; even: horizontal 3×3 — one video each.
 */
export function buildLayout(projectCount: number): Layout {
  const { gridCols, gridRows, staggerOddRows, tileW, tileH } = GLOBE
  const { pitchX, pitchY } = clusterPitch()

  const tiles: TileSlot[] = []
  const clusters: ClusterSlot[] = []

  // Half-cell shift: 3-wide / 3-tall frames then edge on integer lattice lines.
  const alignU = 0.5 * tileW
  const alignV = 0.5 * tileH

  let clusterIndex = 0
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const stagger = staggerOddRows && r % 2 === 1 ? pitchX / 2 : 0
      const slotU = c * pitchX + stagger + alignU
      const slotV = (r - (gridRows - 1) / 2) * pitchY + alignV
      const projectIndex = clusterIndex % projectCount
      const orientation = orientationForCluster(clusterIndex)
      const frame = singleVideoFrame(orientation)

      clusters.push({
        clusterIndex,
        projectIndex,
        u: slotU,
        v: slotV,
        orientation,
        shape: orientation,
      })

      tiles.push({
        id: `${clusterIndex}-0`,
        clusterIndex,
        projectIndex,
        tileIndex: 0,
        u: slotU + frame.du,
        v: slotV + frame.dv,
        w: frame.w,
        h: frame.h,
        orientation,
      })
      clusterIndex++
    }
  }

  return { tiles, clusters }
}
