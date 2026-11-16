/**
 * The Labs field — modelled on labs.griflan.com.
 *
 * NOT a 3D globe. A flat grid, measured in arc length, plastered onto the
 * front face of a sphere far larger than the stage and seen orthographically:
 * rows stay straight, columns are meridians converging on a pole that sits
 * above the top of the frame, and the ball's outline is cropped away — what
 * is left is a field of lines, near flat at the bottom and closing at the top.
 *
 * Every length here is in on-screen px or in lattice cells.
 */

/** A landscape board, cells — 3:2, the library's stills. */
const WIDE = { cols: 9, rows: 6 }
/** The gap between boards, cells — the same in both directions. */
const GUTTER = 2
/** A tall board is as high as two landscape boards and the gap between them. */
const TALL = { cols: WIDE.cols, rows: WIDE.rows * 2 + GUTTER }

export const FIELD = {
  /* ------------------------------- projection ------------------------------ */

  /** Sphere radius, × the stage's half-diagonal (Griflan: 1.35). */
  radius: 1.58,
  /** Least distance of the sphere's top above the stage top, × stage height (Griflan: 0.08). */
  crest: 0.02,
  /**
   * Where the limb crosses the stage's top edge, × half-width; the centre is
   * pushed down until it gets there. This trades convergence for crop:
   * ≥ 1 keeps the ball's outline wholly out of frame but flattens the field;
   * Griflan sits near 0.5, with the ball's shoulders plainly in its top corners.
   * 0.62 fills the top band (no empty gutter) while keeping the silhouette cropped.
   */
  limbClear: 0.62,
  /** Facing (0 at the rim, 1 square-on) over which things dissolve at the rim. */
  fadeFrom: 0.0,
  fadeTo: 0.09,
  /** The flanks' light: how dark the surface runs as it turns sideways. */
  flankDepth: 0.72,

  /* --------------------------------- lattice ------------------------------- */

  /** Flat cells across the stage width — the lattice's density. */
  cellsAcross: 40,
  cellMin: 20,
  cellMax: 44,
  /** Hairline half-width, device px = base + perDpr × dpr. */
  lineBase: 0.25,
  linePerDpr: 0.35,
  latticeAlpha: 0.15,
  /** Rings (rows) relative to meridians. */
  ringStrength: 0.9,

  /* --------------------------------- boards -------------------------------- */

  /**
   * One asset per board, on ONE grid: every column is the same width and every
   * gap — across and down — is the same `gutter`, with a single hairline
   * running down its middle. A column holds either two landscape boards
   * stacked or one tall board exactly as high as that pair, so the rhythm
   * never breaks. Footprints are whole cells: edges sit on lattice lines.
   */
  landscape: WIDE,
  portrait: TALL,
  gutter: GUTTER,
  /** Every nth column is a tall one; each band shifts the pattern one column on. */
  tallEvery: 3,
  /** Seconds for a board to fade in once its picture is decoded. */
  revealSec: 0.5,
  /** Seconds for a reel to dissolve in over its poster frame (and back out). */
  reelMixSec: 0.4,
  /** How far the other boards sink toward the ground while one is hovered. */
  hoverDim: 0.4,
  hoverLift: 0.07,

  /* --------------------------------- motion -------------------------------- */

  /**
   * Dragging takes hold of the surface: the point under the pointer stays
   * under it, however the projection stretches that row. `grabMax` caps how
   * much faster than the hand the field may move (near the pole and the rim
   * the true figure runs away); `dragGain` stands in off the ball.
   */
  grabMax: 2.4,
  dragGain: 1.2,
  /** Mouse drags move the rows too (touch leaves up/down to the page's scroll). */
  dragRows: true,
  wheelGain: 1.0,
  /** Follow rate of the drawn position toward its target: held, and let go. */
  dragFollow: 46,
  follow: 13,
  /** Idle: seconds per full turn, and how fast rows creep up toward the pole. */
  driftTurnSec: 140,
  creepCellsPerSec: 0.62,
  /**
   * Fling: the release speed is read over the last `flingWindowMs` of the drag
   * (a hand that has stopped does not throw), capped at `maxFling` px/s, and
   * glides off at these rates — round the ball into the idle drift, up the rows to rest.
   */
  flingWindowMs: 110,
  maxFling: 5200,
  flingDecay: 1.9,
  rowDecay: 3.2,
  /** Reels are not started or stopped while the field moves faster than this, cells/s. */
  settleSpeed: 9,

  /* ---------------------------------- hover -------------------------------- */

  /** Pointer trail: samples kept, seconds each lives, reach in cells. */
  trailSamples: 10,
  trailLife: 0.85,
  trailReachCells: 3.6,

  /* ---------------------------------- media -------------------------------- */

  /** Live video streams at once (the rest show their last frame, or a poster frame). */
  maxLiveVideos: 3,
  maxLiveVideosTouch: 2,
  /** Paused-but-buffered videos kept before the oldest is unloaded. */
  maxWarmVideos: 3,
  /** Distinct reels placed on the field. */
  maxReels: 10,
  /** Concurrent still downloads. */
  imageConcurrency: 8,

  /* ---------------------------------- colour ------------------------------- */

  ground: '#121010',
  ink: '#fffddb',
  accent: '#e0122e',
  grain: 0.055,
} as const

export type BoardKind = 'L' | 'P'

export function footprint(kind: BoardKind) {
  return kind === 'L' ? FIELD.landscape : FIELD.portrait
}

/** '#rrggbb' → raw sRGB components 0..1 (the shaders write display values directly). */
export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
