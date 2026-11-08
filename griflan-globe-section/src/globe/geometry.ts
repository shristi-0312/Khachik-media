import * as THREE from 'three'
import type { TileSlot } from './layout'
import type { UvRect } from './atlas'

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
export function tileGeometry(slot: TileSlot, R: number, uv: UvRect, segU = 8, segV = 6) {
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
      indices.push(a, b, d, a, d, c) // counter-clockwise seen from outside
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

/** Meridians + parallels as line segments, slightly below the tile surface. */
export function latticeGeometry(R: number, stepDeg: number, latLimitDeg: number) {
  const pts: number[] = []
  const d2r = Math.PI / 180
  const fine = 2 * d2r
  const push = (lat: number, lon: number) => {
    const c = Math.cos(lat)
    pts.push(R * c * Math.sin(lon), R * Math.sin(lat), R * c * Math.cos(lon))
  }

  // Parallels.
  for (let latDeg = -latLimitDeg; latDeg <= latLimitDeg + 1e-6; latDeg += stepDeg) {
    const lat = latDeg * d2r
    for (let lon = 0; lon < Math.PI * 2 - 1e-6; lon += fine) {
      push(lat, lon)
      push(lat, lon + fine)
    }
  }
  // Meridians.
  const latMax = latLimitDeg * d2r
  for (let lonDeg = 0; lonDeg < 360 - 1e-6; lonDeg += stepDeg) {
    const lon = lonDeg * d2r
    for (let lat = -latMax; lat < latMax - 1e-6; lat += fine) {
      push(lat, lon)
      push(Math.min(lat + fine, latMax), lon)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}
