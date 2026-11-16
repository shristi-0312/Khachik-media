/**
 * Every tunable for the globe. Units are CSS pixels at the sphere surface
 * (the orthographic camera is set up so 1 world unit = 1 CSS px).
 *
 * Project frames sit on the lattice:
 * - Horizontal video → 3×3 cells
 * - Vertical video   → 2×3 cells
 * Alternating around the sphere. One video per frame.
 */
export const GLOBE = {
  // Unit cell — video edges snap to these lattice lines (no inner gap).
  tileW: 112,
  tileH: 112,
  tileGap: 0,

  // Max footprint used for atlas / pitch (horizontal 3×3).
  clusterCols: 3,
  clusterRows: 3,

  // Regular sphere grid of equal slots; each slot holds one H or V video.
  gridCols: 10,
  gridRows: 5,
  /** Extra empty cells between frames so neighbours don’t collide. */
  slotPadCells: 1,
  staggerOddRows: true,

  // On screen, the sphere is scaled so its radius = min(radiusVw × width, radiusVh × height).
  // Slightly larger than before so the surface reads closer / more Griflan-like.
  radiusVw: 0.62,
  radiusVh: 1.05,
  scaleMin: 0.7,
  scaleMax: 2.8,

  // Lattice follows unit cells so video edges sit on the grid.
  latticeLatLimitDeg: 86,
  /**
   * Hairline lattice (labs.griflan.com). WebGL often ignores lineWidth, so
   * geometry.ts uses a single stroke — keep this ≤ 1 for a thin read.
   */
  latticeLineWidth: 0.9,
  /** Unused by the lattice-scan glow; kept for geometry helpers. */
  hoverLineWidth: 1.2,

  /** Camera height as a fraction of R — higher = more horizon / bird’s-eye. */
  panDefault: 0.48,
  panMin: 0.12,
  panMax: 0.72,

  driftRadPerSec: 0.028,
  idleDelayMs: 1100,
  wheelSens: 0.0014,
  dragSens: 0.0024,
  panDragSens: 1.15,
  damping: 7,

  bg: '#141312',
  cream: '#fffddb',
  /** Soft neon-red like labs.griflan.com hover (not flat brand fill). */
  red: '#e0122e',
  lattice: '#fffddb',
  latticeAlpha: 0.28,
  /** Peak opacity of cursor-lit lattice lines. */
  hoverLatticeAlpha: 1,
  /**
   * Soft red scan radius in unit-cells (Griflan ~2–4). Wider = softer gradient.
   */
  hoverRadiusCells: 4.2,
  /** Lerp rate for cursor follow on the lattice (higher = snappier). */
  hoverFollow: 11,
} as const

/** Pitch between cluster centres (3-cell frame + pad). */
export function clusterPitch() {
  const { tileW, tileH, clusterCols, clusterRows, slotPadCells } = GLOBE
  return {
    pitchX: (clusterCols + slotPadCells) * tileW,
    pitchY: (clusterRows + slotPadCells) * tileH,
  }
}

/** Sphere radius derived from the grid so columns wrap seamlessly. */
export const R = (GLOBE.gridCols * clusterPitch().pitchX) / (2 * Math.PI)
