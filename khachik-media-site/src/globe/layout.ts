import { GLOBE, clusterPitch } from './config'

/**
 * A tile's place on the sphere, in surface units (arc length).
 * u along the equator, v toward the poles; centre ± w/2, ± h/2.
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

/** Alternating board accent — all boards are 2×2; flag kept for palette variety. */
export function orientationForCluster(clusterIndex: number): 'horizontal' | 'vertical' {
  return clusterIndex % 2 === 0 ? 'horizontal' : 'vertical'
}

/**
 * Griflan-style 2×2 collage — four unit cells, edges on the lattice.
 */
export function boardTiles(clusterIndex: number): { tileIndex: number; aspect: number; area: number }[] {
  void clusterIndex
  const { tileW: W, tileH: H } = GLOBE
  return Array.from({ length: 4 }, (_, tileIndex) => ({
    tileIndex,
    aspect: W / H,
    area: W * H,
  }))
}

export function shapeForCluster(clusterIndex: number): string {
  return orientationForCluster(clusterIndex)
}

/**
 * Staggered grid of 2×2 boards. Each board’s four tiles sit on unit-cell centres
 * so every edge snaps to a meridian / parallel.
 */
export function buildLayout(projectCount: number): Layout {
  const { gridCols, gridRows, staggerOddRows, tileW, tileH, clusterCols, clusterRows } = GLOBE
  const { pitchX, pitchY } = clusterPitch()

  const tiles: TileSlot[] = []
  const clusters: ClusterSlot[] = []

  // Align board centre so a 2×2 lands on integer lattice lines.
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

      clusters.push({
        clusterIndex,
        projectIndex,
        u: slotU,
        v: slotV,
        orientation,
        shape: '2x2',
      })

      // 2×2 unit cells around the board centre.
      let tileIndex = 0
      for (let row = 0; row < clusterRows; row++) {
        for (let col = 0; col < clusterCols; col++) {
          const du = (col - (clusterCols - 1) / 2) * tileW
          const dv = ((clusterRows - 1) / 2 - row) * tileH
          tiles.push({
            id: `${clusterIndex}-${tileIndex}`,
            clusterIndex,
            projectIndex,
            tileIndex,
            u: slotU + du,
            v: slotV + dv,
            w: tileW,
            h: tileH,
            orientation,
          })
          tileIndex++
        }
      }
      clusterIndex++
    }
  }

  return { tiles, clusters }
}
