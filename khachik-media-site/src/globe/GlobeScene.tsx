import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { GLOBE, R } from './config'
import { latticeGeometry, surfaceToSphere, tileGeometry } from './geometry'
import type { Layout, TileSlot } from './layout'
import { PROJECTS, type Project as GlobeProject } from './projects'
import { latticeFragment, latticeVertex, tileFragment, tileVertex } from './shaders'
import type { VideoPool } from './videoPool'

export interface Readout {
  /** Longitude (deg) at the left and right edges of the viewport. */
  left: number
  right: number
}

export interface GlobeSceneProps {
  layout: Layout
  videos: VideoPool
  /** HQ clip sources — defaults to local stock if omitted. */
  projects?: GlobeProject[]
  hoveredCluster: number | null
  onHover: (clusterIndex: number | null, clientX: number, clientY: number) => void
  onSelect: (clusterIndex: number) => void
  onReadout?: (r: Readout) => void
  /** When true (an overlay is open) input is ignored and the globe just drifts. */
  frozen?: boolean
  /**
   * When true (home embed), vertical wheel / vertical gestures scroll the page.
   * Drag still rotates; horizontal trackpad swipe still spins.
   */
  allowPageScroll?: boolean
}

const FULL_UV = { x0: 0, x1: 1, vTop: 1, vBottom: 0 }

const PLACEHOLDER_TEX = (() => {
  const data = new Uint8Array([24, 22, 22, 255])
  const t = new THREE.DataTexture(data, 1, 1)
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
})()

interface SpinState {
  lon: number
  tLon: number
  pan: number
  tPan: number
  /** Current world→screen scale of the sphere (viewport-relative radius). */
  scale: number
  lastInput: number
  dragging: boolean
  pointerId: number | null
  lastX: number
  lastY: number
}

export function GlobeScene({
  layout,
  videos,
  projects = PROJECTS,
  hoveredCluster,
  onHover,
  onSelect,
  onReadout,
  frozen,
  allowPageScroll = false,
}: GlobeSceneProps) {
  const group = useRef<THREE.Group>(null)
  const latticeMatRef = useRef<THREE.ShaderMaterial | null>(null)
  const { gl, camera, size } = useThree()

  const spin = useRef<SpinState>({
    lon: 0,
    tLon: 0,
    pan: GLOBE.panDefault * R,
    tPan: GLOBE.panDefault * R,
    scale: 1,
    lastInput: -Infinity,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  })

  const frozenRef = useRef(!!frozen)
  frozenRef.current = !!frozen
  const pageScrollRef = useRef(allowPageScroll)
  pageScrollRef.current = allowPageScroll

  /** Pending pointer — only commit to drag after a clear horizontal intent. */
  const pending = useRef<{
    id: number
    x: number
    y: number
  } | null>(null)

  /** Raw pointer on the sphere (target) + smoothed uniforms for the lattice glow. */
  const hover = useRef({
    tLat: 0,
    tLon: 0,
    tOn: 0,
    lat: 0,
    lon: 0,
    on: 0,
  })

  /* ---------------------------------- input --------------------------------- */
  useEffect(() => {
    const el = gl.domElement
    const s = spin.current

    const onWheel = (e: WheelEvent) => {
      if (frozenRef.current) return

      if (pageScrollRef.current) {
        // Vertical / mostly-vertical → let the page scroll anywhere over the globe.
        if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) * 0.85) return
        e.preventDefault()
        s.tLon -= e.deltaX * GLOBE.wheelSens
        s.lastInput = performance.now()
        return
      }

      e.preventDefault()
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      s.tLon -= d * GLOBE.wheelSens
      s.lastInput = performance.now()
    }
    const onDown = (e: PointerEvent) => {
      if (frozenRef.current || e.button !== 0) return
      pending.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      s.pointerId = e.pointerId
      s.lastX = e.clientX
      s.lastY = e.clientY
      s.dragging = false
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== s.pointerId) return

      // Decide drag vs page-scroll before capturing the pointer.
      if (!s.dragging && pending.current && pending.current.id === e.pointerId) {
        const dx0 = e.clientX - pending.current.x
        const dy0 = e.clientY - pending.current.y
        const dist = Math.hypot(dx0, dy0)
        if (dist < 8) return
        if (pageScrollRef.current && Math.abs(dy0) > Math.abs(dx0) * 1.15) {
          // Vertical intent → abandon drag so the page can scroll.
          pending.current = null
          s.pointerId = null
          return
        }
        s.dragging = true
        pending.current = null
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* synthetic events have no capturable pointer */
        }
      }

      if (!s.dragging) return
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      s.lastX = e.clientX
      s.lastY = e.clientY
      // Free orbit: drag spins longitude and tilts the camera.
      s.tLon += dx * GLOBE.dragSens
      s.tPan = THREE.MathUtils.clamp(
        s.tPan + (dy * GLOBE.panDragSens) / s.scale,
        GLOBE.panMin * R,
        GLOBE.panMax * R,
      )
      s.lastInput = performance.now()
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== s.pointerId) return
      const wasDragging = s.dragging
      s.dragging = false
      s.pointerId = null
      pending.current = null
      if (wasDragging) s.lastInput = performance.now()
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [gl])

  /* ---------------------------------- frame --------------------------------- */
  useFrame((_, dtRaw) => {
    videos.tick()

    const dt = Math.min(dtRaw, 0.05)
    const s = spin.current
    const idle = !s.dragging && performance.now() - s.lastInput > GLOBE.idleDelayMs
    if (idle || frozenRef.current) s.tLon += GLOBE.driftRadPerSec * dt

    s.lon = THREE.MathUtils.damp(s.lon, s.tLon, GLOBE.damping, dt)
    s.pan = THREE.MathUtils.damp(s.pan, s.tPan, GLOBE.damping, dt)
    const screenR = Math.min(GLOBE.radiusVw * size.width, GLOBE.radiusVh * size.height)
    s.scale = THREE.MathUtils.clamp(screenR / R, GLOBE.scaleMin, GLOBE.scaleMax)

    // Smooth Griflan-style cursor follow on the lattice.
    const h = hover.current
    const follow = GLOBE.hoverFollow
    h.lat = THREE.MathUtils.damp(h.lat, h.tLat, follow, dt)
    h.lon = THREE.MathUtils.damp(h.lon, h.tLon, follow, dt)
    h.on = THREE.MathUtils.damp(h.on, h.tOn, follow, dt)
    const mat = latticeMatRef.current
    if (mat) {
      mat.uniforms.uHoverLat.value = h.lat
      mat.uniforms.uHoverLon.value = h.lon
      mat.uniforms.uHoverOn.value = h.on
    }

    if (group.current) {
      group.current.rotation.y = s.lon
      group.current.scale.setScalar(s.scale)
      group.current.position.y = 0
    }
    camera.position.y = s.pan * s.scale

    // Keep cream lattice looking thicker across GPUs (lineWidth is often capped at 1).
    try {
      gl.getContext().lineWidth(GLOBE.latticeLineWidth)
    } catch {
      /* ignore */
    }

    if (onReadout) {
      const half = Math.asin(Math.min(1, size.width / 2 / (R * s.scale))) * (180 / Math.PI)
      const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180
      const centre = -s.lon * (180 / Math.PI)
      onReadout({ left: wrap(centre - half), right: wrap(centre + half) })
    }
  })

  /* --------------------------------- content -------------------------------- */
  const lattice = useMemo(() => {
    // Identical radius to tiles so edges meet lattice lines in screen space.
    const geometry = latticeGeometry(R, GLOBE.latticeLatLimitDeg)
    // ~2.6 cells of glow — matches Griflan’s tight cursor scan.
    const falloff = (GLOBE.hoverRadiusCells * GLOBE.tileW) / R
    const material = new THREE.ShaderMaterial({
      vertexShader: latticeVertex,
      fragmentShader: latticeFragment,
      uniforms: {
        uColor: { value: new THREE.Color(GLOBE.lattice) },
        uHoverColor: { value: new THREE.Color(GLOBE.red) },
        uAlpha: { value: GLOBE.latticeAlpha },
        uHoverAlpha: { value: GLOBE.hoverLatticeAlpha },
        uHoverLat: { value: 0 },
        uHoverLon: { value: 0 },
        uHoverOn: { value: 0 },
        uFalloff: { value: falloff },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
    })
    latticeMatRef.current = material
    return { geometry, material }
  }, [])

  useEffect(
    () => () => {
      lattice.geometry?.dispose()
      lattice.material?.dispose()
      latticeMatRef.current = null
    },
    [lattice],
  )

  /** Drive lattice glow from sphere / tile hit points (surface lat/lon). */
  const setLatticeHover = (lat: number, lon: number, on: boolean) => {
    const h = hover.current
    if (on) {
      h.tLat = lat
      h.tLon = lon
      h.tOn = 1
    } else {
      h.tOn = 0
    }
  }

  const onHitSphere = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    const p = e.point.clone()
    if (group.current) group.current.worldToLocal(p)
    const len = p.length() || 1
    const n = p.multiplyScalar(1 / len)
    const lat = Math.asin(THREE.MathUtils.clamp(n.y, -1, 1))
    const lon = Math.atan2(n.x, n.z)
    setLatticeHover(lat, lon, true)
  }

  const onLeaveSphere = () => {
    if (frozenRef.current) return
    setLatticeHover(0, 0, false)
  }

  return (
    <group ref={group}>
      {/* Opaque inner sphere: hides the far side of the lattice and tiles. */}
      <mesh>
        <sphereGeometry args={[R - 1.5, 96, 64]} />
        <meshBasicMaterial color={GLOBE.bg} />
      </mesh>

      {/* Invisible hit sphere for lattice hover when not over a tile. */}
      <mesh
        onPointerMove={onHitSphere}
        onPointerOver={onHitSphere}
        onPointerOut={onLeaveSphere}
      >
        <sphereGeometry args={[R - 0.15, 64, 48]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Cream lattice — cursor paints nearby lines brand-red (Griflan scan). */}
      <lineSegments
        geometry={lattice.geometry}
        material={lattice.material}
        renderOrder={1}
      />

      {layout.tiles.map((slot) => (
        <Tile
          key={slot.id}
          slot={slot}
          projects={projects}
          videos={videos}
          dim={hoveredCluster !== null && hoveredCluster !== slot.clusterIndex}
          hover={hoveredCluster === slot.clusterIndex}
          onHover={onHover}
          onSelect={onSelect}
          onLatticeHover={setLatticeHover}
          spin={spin}
          frozenRef={frozenRef}
        />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------------ */

interface TileProps {
  slot: TileSlot
  projects: GlobeProject[]
  videos: VideoPool
  dim: boolean
  hover: boolean
  onHover: GlobeSceneProps['onHover']
  onSelect: GlobeSceneProps['onSelect']
  onLatticeHover: (lat: number, lon: number, on: boolean) => void
  spin: MutableRefObject<SpinState>
  frozenRef: MutableRefObject<boolean>
}

function Tile({
  slot,
  projects,
  videos,
  dim,
  hover,
  onHover,
  onSelect,
  onLatticeHover,
  spin,
  frozenRef,
}: TileProps) {
  const project = projects[slot.projectIndex]
  const src =
    project?.videos?.[slot.tileIndex] ??
    project?.videos?.[0] ??
    project?.images?.[slot.tileIndex] ??
    project?.images?.[0] ??
    ''
  const phase = (slot.clusterIndex + slot.tileIndex) % 2

  const geometry = useMemo(() => tileGeometry(slot, R, FULL_UV), [slot])

  const texture = useMemo(() => {
    if (!src) return PLACEHOLDER_TEX
    return videos.textureFor(src, phase)
  }, [videos, src, phase])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: tileVertex,
        fragmentShader: tileFragment,
        uniforms: {
          uMap: { value: texture },
          uDim: { value: 0 },
          uHover: { value: 0 },
          uTileAspect: { value: slot.w / slot.h },
          uVideoAspect: { value: slot.w / slot.h },
        },
        // Prefer tiles over co-radial lattice so cream lines show only in gaps.
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        depthWrite: true,
      }),
    [texture, slot.w, slot.h],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, dt) => {
    const u = material.uniforms
    u.uDim.value = THREE.MathUtils.damp(u.uDim.value, dim ? 1 : 0, 10, dt)
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, hover ? 1 : 0, 10, dt)
    if (src) u.uVideoAspect.value = videos.aspectFor(src, phase)
  })

  const syncLattice = (e: ThreeEvent<PointerEvent>) => {
    const p = e.point.clone()
    // Point is in world space; tile is under the spinning group — use local via surface of slot centre as fallback.
    const centre = surfaceToSphere(slot.u, slot.v, R)
    // Prefer event local point if available
    const local = e.object.worldToLocal(e.point.clone())
    const n = local.lengthSq() > 0.01 ? local.normalize() : centre.normalize()
    const lat = Math.asin(THREE.MathUtils.clamp(n.y, -1, 1))
    const lon = Math.atan2(n.x, n.z)
    onLatticeHover(lat, lon, true)
    void p
  }

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    e.stopPropagation()
    onHover(slot.clusterIndex, e.clientX, e.clientY)
    syncLattice(e)
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    e.stopPropagation()
    onHover(slot.clusterIndex, e.clientX, e.clientY)
    syncLattice(e)
  }
  const out = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    onHover(null, e.clientX, e.clientY)
    onLatticeHover(0, 0, false)
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (frozenRef.current) return
    if (e.delta > 6 || spin.current.dragging) return
    e.stopPropagation()
    onSelect(slot.clusterIndex)
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={2}
      onPointerOver={over}
      onPointerMove={move}
      onPointerOut={out}
      onClick={click}
    />
  )
}
