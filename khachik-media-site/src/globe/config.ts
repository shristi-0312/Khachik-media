/**
 * Every tunable for the globe. Units are CSS pixels at the sphere surface
 * (the orthographic camera is set up so 1 world unit = 1 CSS px).
 */
export const GLOBE = {
  // Unit cell inside each project frame (clusters are always 3×2 of these).
  tileW: 118,
  tileH: 80,
  tileGap: 6,

  // Atlas packs this many cells per project (layout maps a subset into the frame).
  clusterCols: 3,
  clusterRows: 2,

  // Regular sphere grid — equal spacing between same-sized project frames.
  gridCols: 10,
  gridRows: 5,
  pitchX: 500,
  pitchY: 330,
  staggerOddRows: true,

  // On screen, the sphere is scaled so its radius = min(radiusVw × width, radiusVh × height).
  radiusVw: 0.55,
  radiusVh: 0.95,
  scaleMin: 0.7,
  scaleMax: 2.5,

  latticeStepDeg: 10,
  latticeLatLimitDeg: 86,

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
  red: '#ff3831',
  lattice: '#fffddb',
  latticeAlpha: 0.18,
} as const

/** Sphere radius derived from the grid so columns wrap seamlessly. */
export const R = (GLOBE.gridCols * GLOBE.pitchX) / (2 * Math.PI)
