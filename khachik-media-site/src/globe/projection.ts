import { FIELD } from './config'

/**
 * The sphere, in stage px (origin top-left, y down).
 *
 * A surface point is named by its ARC LENGTH from the centre meridian (gx)
 * and from the equator (gy):
 *
 *   u = gx / R              v = gy / R
 *   X = cx + R·cos v·sin u  Y = cy + R·sin v      facing = cos v·cos u
 *
 * Rows (constant gy) project to horizontal lines; columns (constant gx) are
 * meridians that close on the pole. Near the equator the map is the identity.
 * The shaders evaluate exactly this — see shaders.ts.
 */
export interface Frame {
  w: number
  h: number
  /** Sphere radius. */
  R: number
  /** Sphere centre. cy is far below the stage: the pole is just above its top. */
  cx: number
  cy: number
  /** Lattice step. */
  cell: number
  /** Latitude (radians, negative = north) at the stage's top and bottom edges. */
  vTop: number
  vBottom: number
}

const HALF_PI = Math.PI / 2

export function frameFor(w: number, h: number): Frame {
  const R = (FIELD.radius * Math.hypot(w, h)) / 2
  // Lift the pole until the limb passes outside the top corners: the
  // silhouette is a circle of radius R about (cx, cy), so the corners are
  // inside it once cy² + (w/2)² ≤ R².
  const reach = Math.min((w / 2) * FIELD.limbClear, R * 0.98)
  const lift = Math.max(FIELD.crest * h, R - Math.sqrt(R * R - reach * reach))
  const cy = R - lift
  const cell = Math.min(FIELD.cellMax, Math.max(FIELD.cellMin, w / FIELD.cellsAcross))
  const lat = (y: number) => Math.asin(Math.min(1, Math.max(-1, (y - cy) / R)))
  return { w, h, R, cx: w / 2, cy, cell, vTop: lat(0), vBottom: lat(h) }
}

/** Surface arc lengths → stage px and facing. */
export function project(f: Frame, gx: number, gy: number) {
  const u = Math.min(HALF_PI, Math.max(-HALF_PI, gx / f.R))
  const v = Math.min(HALF_PI, Math.max(-HALF_PI, gy / f.R))
  const cv = Math.cos(v)
  return {
    x: f.cx + f.R * cv * Math.sin(u),
    y: f.cy + f.R * Math.sin(v),
    facing: cv * Math.cos(gx / f.R),
  }
}

/** Stage px → surface arc lengths, or null off the ball. */
export function unproject(f: Frame, x: number, y: number): { gx: number; gy: number } | null {
  const sv = (y - f.cy) / f.R
  if (sv <= -1 || sv >= 1) return null
  const v = Math.asin(sv)
  const su = (x - f.cx) / (f.R * Math.cos(v))
  if (su <= -1 || su >= 1) return null
  return { gx: Math.asin(su) * f.R, gy: v * f.R }
}

/** x − k·period for the whole k that brings it nearest zero. */
export function wrap(x: number, period: number) {
  return x - Math.round(x / period) * period
}
