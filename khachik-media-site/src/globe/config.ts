/**
 * Tunables for the Griflan-style globe.
 * Orthographic camera: 1 world unit ≈ 1 CSS px at the sphere surface.
 *
 * Boards are 2×2 unit cells (Griflan collage blocks) on a dense lattice.
 * Camera sits high enough that the upper surface curves into a horizon
 * while the lower edge stays wide / full-bleed in the viewport.
 */
export const GLOBE = {
  // Unit cell — board tiles and lattice share this spacing.
  tileW: 96,
  tileH: 96,
  tileGap: 0,

  // 2×2 collage board (Griflan project block).
  clusterCols: 2,
  clusterRows: 2,

  // Sphere packing — denser = more Griflan-like coverage.
  gridCols: 12,
  gridRows: 6,
  /** Empty cells between boards so neighbours don’t collide. */
  slotPadCells: 1,
  staggerOddRows: true,

  /**
   * Sphere fills most of the viewport. Slightly >0.5 width so the surface
   * is close; top curves into a rounded horizon, bottom stays wide.
   */
  radiusVw: 0.56,
  radiusVh: 0.98,
  scaleMin: 0.7,
  scaleMax: 2.6,

  latticeLatLimitDeg: 86,
  /** Hairline lattice (WebGL often ignores lineWidth). */
  latticeLineWidth: 0.85,
  hoverLineWidth: 1.1,

  /**
   * High enough for a curved horizon at top, low enough that boards fill
   * the mid/lower frame (less empty pole space).
   */
  panDefault: 0.42,
  panMin: 0.22,
  panMax: 0.68,

  driftRadPerSec: 0.026,
  idleDelayMs: 1000,
  wheelSens: 0.0014,
  dragSens: 0.0022,
  panDragSens: 1.05,
  damping: 7,

  bg: '#161414',
  cream: '#fffddb',
  /** Soft neon-red lattice hover (labs.griflan.com). */
  red: '#e0122e',
  lattice: '#fffddb',
  latticeAlpha: 0.32,
  hoverLatticeAlpha: 1,
  hoverRadiusCells: 3.6,
  hoverFollow: 12,
} as const

/** Pitch between cluster centres (board + pad). */
export function clusterPitch() {
  const { tileW, tileH, clusterCols, clusterRows, slotPadCells } = GLOBE
  return {
    pitchX: (clusterCols + slotPadCells) * tileW,
    pitchY: (clusterRows + slotPadCells) * tileH,
  }
}

/** Sphere radius so columns wrap seamlessly. */
export const R = (GLOBE.gridCols * clusterPitch().pitchX) / (2 * Math.PI)
