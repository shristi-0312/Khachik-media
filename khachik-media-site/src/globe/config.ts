/**
 * Every tunable for the globe. Units are CSS pixels at the sphere surface
 * (the orthographic camera is set up so 1 world unit = 1 CSS px).
 */
export const GLOBE = {
  // One tile (thumbnail) on the sphere surface.
  tileW: 118,
  tileH: 80,
  tileGap: 6,

  // A project = a cluster of tiles, laid out clusterCols × clusterRows.
  clusterCols: 3,
  clusterRows: 2,

  // The cluster grid wrapped around the sphere. gridCols × pitchX is the
  // circumference, which is what sets the (unscaled) sphere radius.
  gridCols: 10,
  gridRows: 5,
  pitchX: 500,
  pitchY: 330,
  staggerOddRows: true,

  // On screen, the sphere is scaled so its radius = min(radiusVw × width, radiusVh × height).
  // 0.55 × width puts the silhouette just outside the viewport edges, so edge tiles
  // are strongly foreshortened; the height cap keeps the top "horizon" in view on
  // wide screens.
  radiusVw: 0.55,
  radiusVh: 0.95,
  scaleMin: 0.7,
  scaleMax: 2.5,

  // Lattice ("netting") spacing in degrees, and how far toward the poles it runs.
  latticeStepDeg: 10,
  latticeLatLimitDeg: 86,

  // Camera: how far above the sphere's equator the viewport centre sits,
  // as a fraction of R. Larger = more of the top "horizon" compression.
  panDefault: 0.4,
  panMin: 0.1,
  panMax: 0.6,

  // Motion.
  driftRadPerSec: 0.03, // idle auto-spin
  idleDelayMs: 900, // how long after the last input before drift resumes
  wheelSens: 0.0014, // radians of longitude per wheel px
  dragSens: 0.0021, // radians of longitude per dragged px
  panDragSens: 1.0, // world px of vertical pan per dragged px
  damping: 6, // higher = snappier follow

  // Colours.
  bg: '#181616',
  cream: '#fffddb',
  red: '#ff3831',
  lattice: '#fffddb',
  latticeAlpha: 0.18,
} as const

/** Sphere radius derived from the grid so columns wrap seamlessly. */
export const R = (GLOBE.gridCols * GLOBE.pitchX) / (2 * Math.PI)
