import * as THREE from 'three'
import { GLOBE } from './config'
import type { UvRect } from './atlas'
import type { TileSlot } from './layout'

/** Surface units (arc length) → point on the sphere of radius R. */
export function surfaceToSphere(u: number, v: number, R: number, out = new THREE.Vector3()) {
  const lon = u / R
  const lat = v / R
  const c = Math.cos(lat)
  return out.set(R * c * Math.sin(lon), R * Math.sin(lat), R * c * Math.cos(lon))
}

/**
 * A tile "plastered" onto the sphere: a subdivided rectangle whose vertices
 * all sit exactly on the surface. Rows stay straight, columns follow meridians.
 */
export function tileGeometry(slot: TileSlot, R: number, uv: UvRect, segU = 16, segV = 16) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const p = new THREE.Vector3()

  for (let j = 0; j <= segV; j++) {
    const tv = j / segV
    const v = slot.v + (tv - 0.5) * slot.h
    for (let i = 0; i <= segU; i++) {
      const tu = i / segU
      const u = slot.u + (tu - 0.5) * slot.w
      surfaceToSphere(u, v, R, p)
      positions.push(p.x, p.y, p.z)
      uvs.push(uv.x0 + (uv.x1 - uv.x0) * tu, uv.vBottom + (uv.vTop - uv.vBottom) * tv)
    }
  }

  const stride = segU + 1
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * stride + i
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, b, d, a, d, c)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

/**
 * Meridians + parallels snapped to unit-cell spacing so video edges sit on the grid.
 * Each stroke is drawn as a small angular bundle so lines read thicker than 1px
 * WebGL LineSegments (lineWidth is ignored on most platforms).
 */
export function latticeGeometry(R: number, latLimitDeg: number) {
  const pts: number[] = []
  const d2r = Math.PI / 180
  const fine = 1.5 * d2r
  const cellU = GLOBE.tileW
  const cellV = GLOBE.tileH
  const stepLon = cellU / R
  const stepLat = cellV / R
  const latMax = latLimitDeg * d2r
  // Tight multi-stroke so fatness reads as one line (not parallel tracks).
  const fat = (0.35 * GLOBE.latticeLineWidth) / R
  const fatOffsets = [-fat, -fat * 0.5, 0, fat * 0.5, fat]

  const push = (lat: number, lon: number) => {
    const c = Math.cos(lat)
    pts.push(R * c * Math.sin(lon), R * Math.sin(lat), R * c * Math.cos(lon))
  }

  // Parallels — every unit-cell in v.
  for (let lat = 0; lat <= latMax + 1e-9; lat += stepLat) {
    for (const sign of lat === 0 ? [1] : [1, -1]) {
      const L = lat * sign
      for (const dLat of fatOffsets) {
        const LL = THREE.MathUtils.clamp(L + dLat, -latMax, latMax)
        for (let lon = 0; lon < Math.PI * 2 - 1e-9; lon += fine) {
          push(LL, lon)
          push(LL, lon + fine)
        }
      }
    }
  }

  // Meridians — every unit-cell in u.
  const lonCount = Math.max(1, Math.round((Math.PI * 2) / stepLon))
  const lonStep = (Math.PI * 2) / lonCount
  for (let i = 0; i < lonCount; i++) {
    const lon = i * lonStep
    for (const dLon of fatOffsets) {
      const lo = lon + dLon
      for (let lat = -latMax; lat < latMax - 1e-9; lat += fine) {
        push(lat, lo)
        push(Math.min(lat + fine, latMax), lo)
      }
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

/** One parallel + one meridian at the given lat/lon — red hover crosshair. */
export function crosshairGeometry(R: number, lat: number, lon: number, latLimitDeg: number) {
  const pts: number[] = []
  const d2r = Math.PI / 180
  const fine = 1.2 * d2r
  const latMax = latLimitDeg * d2r
  const fat = (0.4 * GLOBE.hoverLineWidth) / R
  const fatOffsets = [-fat, -fat * 0.5, 0, fat * 0.5, fat]
  const push = (la: number, lo: number) => {
    const c = Math.cos(la)
    pts.push(R * c * Math.sin(lo), R * Math.sin(la), R * c * Math.cos(lo))
  }

  // Parallel through hover latitude.
  const L = THREE.MathUtils.clamp(lat, -latMax, latMax)
  for (const dLat of fatOffsets) {
    const LL = THREE.MathUtils.clamp(L + dLat, -latMax, latMax)
    for (let lo = 0; lo < Math.PI * 2 - 1e-9; lo += fine) {
      push(LL, lo)
      push(LL, lo + fine)
    }
  }
  // Meridian through hover longitude.
  for (const dLon of fatOffsets) {
    const lo = lon + dLon
    for (let la = -latMax; la < latMax - 1e-9; la += fine) {
      push(la, lo)
      push(Math.min(la + fine, latMax), lo)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

/** Snap surface lat/lon to the nearest lattice line. */
export function snapToLattice(lat: number, lon: number, R: number) {
  const stepLat = GLOBE.tileH / R
  const stepLon = GLOBE.tileW / R
  const snappedLat = Math.round(lat / stepLat) * stepLat
  const lonCount = Math.max(1, Math.round((Math.PI * 2) / stepLon))
  const lonStep = (Math.PI * 2) / lonCount
  // Normalize lon to [0, 2π)
  let lo = ((lon % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const snappedLon = Math.round(lo / lonStep) * lonStep
  return { lat: snappedLat, lon: snappedLon }
}
