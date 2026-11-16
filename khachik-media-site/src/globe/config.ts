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
  radiusVw: 0.55,
  radiusVh: 0.95,
  scaleMin: 0.7,
  scaleMax: 2.5,

  // Lattice follows unit cells so video edges sit on the grid.
  latticeLatLimitDeg: 86,
  /** Relative fatness for cream grid (angular multi-stroke; WebGL ignores lineWidth). */
  latticeLineWidth: 2.4,
  /** Unused by the lattice-scan glow; kept for geometry helpers. */
  hoverLineWidth: 2.8,

  panDefault: 0.4,
  panMin: 0.1,
  panMax: 0.6,

  driftRadPerSec: 0.03,
  idleDelayMs: 900,
  wheelSens: 0.0014,
  dragSens: 0.0021,
  panDragSens: 1.0,
  damping: 6,

  bg: '#181616',
  cream: '#fffddb',
  /** Soft neon-red like labs.griflan.com hover (not flat brand fill). */
  red: '#e0122e',
  lattice: '#fffddb',
  latticeAlpha: 0.38,
  /** Peak opacity of cursor-lit lattice lines. */
  hoverLatticeAlpha: 0.95,
  /**
   * Glow radius in unit-cells (Griflan ~2–4). Converted to radians via tileW/R.
   * Small = sharp “scan” of nearby meridians/parallels only.
   */
  hoverRadiusCells: 2.6,
  /** Lerp rate for cursor follow on the lattice (higher = snappier). */
  hoverFollow: 14,
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
