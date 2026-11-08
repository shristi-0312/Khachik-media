import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { GLOBE, R } from './config'
import type { Layout, TileSlot } from './layout'
import type { Atlas } from './atlas'
import { latticeGeometry, tileGeometry } from './geometry'
import { latticeFragment, latticeVertex, tileFragment, tileVertex } from './shaders'

export interface Readout {
  /** Longitude (deg) at the left and right edges of the viewport. */
  left: number
  right: number
}

export interface GlobeSceneProps {
  layout: Layout
  atlas: Atlas
  hoveredCluster: number | null
  onHover: (clusterIndex: number | null, clientX: number, clientY: number) => void
  onSelect: (clusterIndex: number) => void
  onReadout?: (r: Readout) => void
  /** When true (an overlay is open) input is ignored and the globe just drifts. */
  frozen?: boolean
  /**
   * When true (home embed), vertical wheel scrolls the page instead of spinning
   * the globe. Drag still rotates; horizontal trackpad swipe still spins.
   */
  allowPageScroll?: boolean
}

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
  atlas,
  hoveredCluster,
  onHover,
  onSelect,
  onReadout,
  frozen,
  allowPageScroll = false,
}: GlobeSceneProps) {
  const group = useRef<THREE.Group>(null)
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

  /* ---------------------------------- input --------------------------------- */
  useEffect(() => {
    const el = gl.domElement
    const s = spin.current

    const onWheel = (e: WheelEvent) => {
      if (frozenRef.current) return

      // Home embed: let vertical wheel scroll the page; only horizontal spins.
      if (pageScrollRef.current) {
        if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return
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
      s.dragging = true
      s.pointerId = e.pointerId
      s.lastX = e.clientX
      s.lastY = e.clientY
      s.lastInput = performance.now()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic events have no capturable pointer */
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== s.pointerId) return
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      s.lastX = e.clientX
      s.lastY = e.clientY
      s.tLon += dx * GLOBE.dragSens
      // On the home page, ignore vertical drag-pan so a slight drag while
      // scrolling doesn't fight the page.
      if (!pageScrollRef.current) {
        s.tPan = THREE.MathUtils.clamp(
          s.tPan + (dy * GLOBE.panDragSens) / s.scale,
          GLOBE.panMin * R,
          GLOBE.panMax * R,
        )
      }
      s.lastInput = performance.now()
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== s.pointerId) return
      s.dragging = false
      s.pointerId = null
      s.lastInput = performance.now()
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
    atlas.tick()

    const dt = Math.min(dtRaw, 0.05)
    const s = spin.current
    const idle = !s.dragging && performance.now() - s.lastInput > GLOBE.idleDelayMs
    if (idle || frozenRef.current) s.tLon += GLOBE.driftRadPerSec * dt

    s.lon = THREE.MathUtils.damp(s.lon, s.tLon, GLOBE.damping, dt)
    s.pan = THREE.MathUtils.damp(s.pan, s.tPan, GLOBE.damping, dt)
    const screenR = Math.min(GLOBE.radiusVw * size.width, GLOBE.radiusVh * size.height)
    s.scale = THREE.MathUtils.clamp(screenR / R, GLOBE.scaleMin, GLOBE.scaleMax)

    if (group.current) {
      group.current.rotation.y = s.lon
      group.current.scale.setScalar(s.scale)
    }
    camera.position.y = s.pan * s.scale

    if (onReadout) {
      const half = Math.asin(Math.min(1, size.width / 2 / (R * s.scale))) * (180 / Math.PI)
      const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180
      const centre = -s.lon * (180 / Math.PI)
      onReadout({ left: wrap(centre - half), right: wrap(centre + half) })
    }
  })

  /* --------------------------------- content -------------------------------- */
  const lattice = useMemo(
    () => ({
      geometry: latticeGeometry(R - 0.6, GLOBE.latticeStepDeg, GLOBE.latticeLatLimitDeg),
      material: new THREE.ShaderMaterial({
        vertexShader: latticeVertex,
        fragmentShader: latticeFragment,
        uniforms: {
          uColor: { value: new THREE.Color(GLOBE.lattice) },
          uAlpha: { value: GLOBE.latticeAlpha },
        },
        transparent: true,
        depthWrite: false,
      }),
    }),
    [],
  )

  return (
    <group ref={group}>
      {/* Opaque inner sphere: hides the far side of the lattice and tiles. */}
      <mesh>
        <sphereGeometry args={[R - 1.5, 96, 64]} />
        <meshBasicMaterial color={GLOBE.bg} />
      </mesh>

      <lineSegments geometry={lattice.geometry} material={lattice.material} />

      {layout.tiles.map((slot) => (
        <Tile
          key={slot.id}
          slot={slot}
          atlas={atlas}
          dim={hoveredCluster !== null && hoveredCluster !== slot.clusterIndex}
          hover={hoveredCluster === slot.clusterIndex}
          onHover={onHover}
          onSelect={onSelect}
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
  atlas: Atlas
  dim: boolean
  hover: boolean
  onHover: GlobeSceneProps['onHover']
  onSelect: GlobeSceneProps['onSelect']
  spin: MutableRefObject<SpinState>
  frozenRef: MutableRefObject<boolean>
}

function Tile({ slot, atlas, dim, hover, onHover, onSelect, spin, frozenRef }: TileProps) {
  const geometry = useMemo(() => tileGeometry(slot, R, atlas.rect(slot.projectIndex, slot.tileIndex)), [slot, atlas])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: tileVertex,
        fragmentShader: tileFragment,
        uniforms: {
          uMap: { value: atlas.texture },
          uDim: { value: 0 },
          uHover: { value: 0 },
        },
      }),
    [atlas],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // Ease the dim/hover uniforms so highlight changes are not a hard cut.
  useFrame((_, dt) => {
    const u = material.uniforms
    u.uDim.value = THREE.MathUtils.damp(u.uDim.value, dim ? 1 : 0, 10, dt)
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, hover ? 1 : 0, 10, dt)
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    e.stopPropagation()
    onHover(slot.clusterIndex, e.clientX, e.clientY)
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    onHover(slot.clusterIndex, e.clientX, e.clientY)
  }
  const out = (e: ThreeEvent<PointerEvent>) => {
    if (frozenRef.current) return
    onHover(null, e.clientX, e.clientY)
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (frozenRef.current) return
    // Ignore "clicks" that were really a drag.
    if (e.delta > 6 || spin.current.dragging) return
    e.stopPropagation()
    onSelect(slot.clusterIndex)
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      onPointerOver={over}
      onPointerMove={move}
      onPointerOut={out}
      onClick={click}
    />
  )
}
