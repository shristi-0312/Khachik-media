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
}

export interface Layout {
  tiles: TileSlot[]
  clusters: ClusterSlot[]
}

export function buildLayout(projectCount: number): Layout {
  const { gridCols, gridRows, pitchX, pitchY, clusterCols, clusterRows, tileW, tileH, tileGap, staggerOddRows } =
    GLOBE

  const tiles: TileSlot[] = []
  const clusters: ClusterSlot[] = []
  const tilesPerCluster = clusterCols * clusterRows

  let clusterIndex = 0
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const stagger = staggerOddRows && r % 2 === 1 ? pitchX / 2 : 0
      const u = c * pitchX + stagger
      const v = (r - (gridRows - 1) / 2) * pitchY
      const projectIndex = clusterIndex % projectCount
      clusters.push({ clusterIndex, projectIndex, u, v })

      for (let j = 0; j < clusterRows; j++) {
        for (let i = 0; i < clusterCols; i++) {
          const tileIndex = j * clusterCols + i
          tiles.push({
            id: `${clusterIndex}-${tileIndex}`,
            clusterIndex,
            projectIndex,
            tileIndex: tileIndex % tilesPerCluster,
            u: u + (i - (clusterCols - 1) / 2) * (tileW + tileGap),
            v: v - (j - (clusterRows - 1) / 2) * (tileH + tileGap),
            w: tileW,
            h: tileH,
          })
        }
      }
      clusterIndex++
    }
  }

  return { tiles, clusters }
}
