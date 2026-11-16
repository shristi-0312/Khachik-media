import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { apiConfigured, fetchMedia, type ApiMediaItem } from '../api/client'
import { GLOBE, R } from '../globe/config'
import { GlobeScene, type Readout } from '../globe/GlobeScene'
import { buildLayout } from '../globe/layout'
import {
  buildGlobeProjects,
  PROJECTS,
  type GlobeMediaItem,
  type Project as GlobeProject,
} from '../globe/projects'
import { buildVideoPool, type VideoPool } from '../globe/videoPool'
import { useBasePath } from '../hooks/useBasePath'
import styles from './HomeGlobe.module.css'

function toGlobeMedia(items: ApiMediaItem[]): GlobeMediaItem[] {
  return items
    .filter((i) => i.published !== false && i.url)
    .map((i) => ({
      url: i.url,
      mediaType: i.mediaType,
      title: i.title,
      section: i.section,
    }))
}

const ZERO_SCROLL = { current: 0 } as MutableRefObject<number>

/** Interactive globe — mixed S3 films/stills, hairline lattice, free drag. */
export function HomeGlobe({
  scrollProgressRef = ZERO_SCROLL,
}: {
  scrollProgressRef?: MutableRefObject<number>
}) {
  const host = useRef<HTMLDivElement>(null)
  const vignette = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  /** Wait until near the viewport so hero CDN boot is not starved by dozens of HQ clips. */
  const [nearView, setNearView] = useState(false)
  const [videos, setVideos] = useState<VideoPool | null>(null)
  const [globeProjects, setGlobeProjects] = useState<GlobeProject[]>(PROJECTS)
  const navigate = useNavigate()
  const base = useBasePath()

  // Keep CSS soft-red intensity in sync without React re-renders.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = vignette.current
      if (!el) return
      el.style.setProperty('--globe-scroll', String(scrollProgressRef.current))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scrollProgressRef])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearView(true)
          io.disconnect()
        }
      },
      { rootMargin: '280px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!nearView) return
    const el = host.current
    if (!el) return

    const check = () => {
      const { clientWidth: w, clientHeight: h } = el
      if (w > 100 && h > 100) setReady(true)
    }

    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    window.addEventListener('resize', check)
    const t = window.setTimeout(check, 200)
    const t2 = window.setTimeout(check, 800)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [nearView])

  // Pull every library section (films + stills + globe clips) and mix onto the sphere.
  useEffect(() => {
    if (!nearView || !apiConfigured()) return
    let cancelled = false
    void (async () => {
      try {
        const all = await fetchMedia()
        if (cancelled) return
        const library = toGlobeMedia(all)
        if (library.length) setGlobeProjects(buildGlobeProjects(library))
      } catch {
        /* keep local fallbacks */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [nearView])

  // Native VideoTextures / still textures so HQ stays sharp on large frames.
  useEffect(() => {
    if (!nearView) return
    const next = buildVideoPool()
    setVideos(next)
    return () => {
      next.dispose()
      setVideos(null)
    }
  }, [nearView, globeProjects])

  const layout = useMemo(() => buildLayout(globeProjects.length), [globeProjects.length])
  const [hovered, setHovered] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const tooltip = useRef<HTMLDivElement>(null)
  const leftReadout = useRef<HTMLSpanElement>(null)
  const rightReadout = useRef<HTMLSpanElement>(null)

  const onHover = useCallback(
    (cluster: number | null, x: number, y: number) => {
      setHovered((prev) => (prev === cluster ? prev : cluster))
      const el = tooltip.current
      if (!el) return
      if (cluster === null) {
        el.style.opacity = '0'
        return
      }
      const project = globeProjects[layout.clusters[cluster]!.projectIndex]
      el.textContent = `${project?.name ?? ''} — ${project?.category ?? ''}`
      el.style.transform = `translate(${x + 14}px, ${y + 18}px)`
      el.style.opacity = '1'
    },
    [layout, globeProjects],
  )

  const onSelect = useCallback(
    (clusterIndex: number) => {
      const project = globeProjects[layout.clusters[clusterIndex]!.projectIndex]
      if (!project) return
      navigate(`${base}/projects/${project.slug}`)
    },
    [layout, navigate, base, globeProjects],
  )

  const onReadout = useCallback((r: Readout) => {
    if (leftReadout.current) leftReadout.current.textContent = r.left.toFixed(6)
    if (rightReadout.current) rightReadout.current.textContent = r.right.toFixed(6)
  }, [])

  return (
    <div
      ref={host}
      className={styles.stage}
      style={{ cursor: dragging ? 'grabbing' : hovered !== null ? 'pointer' : 'grab' }}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
    >
      {ready && videos ? (
        <Canvas
          orthographic
          dpr={[1, 2]}
          camera={{ position: [0, GLOBE.panDefault * R, R * 4], near: 1, far: R * 10, zoom: 1 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.setClearColor(GLOBE.bg)
            gl.outputColorSpace = THREE.SRGBColorSpace
          }}
          style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
        >
          <GlobeScene
            layout={layout}
            videos={videos}
            projects={globeProjects}
            hoveredCluster={hovered}
            onHover={onHover}
            onSelect={onSelect}
            onReadout={onReadout}
            allowPageScroll
          />
        </Canvas>
      ) : null}

      <div ref={vignette} className={styles.vignette} aria-hidden="true" />
      <span ref={leftReadout} className={`${styles.readout} ${styles.readoutLeft}`}>
        0.000000
      </span>
      <span ref={rightReadout} className={`${styles.readout} ${styles.readoutRight}`}>
        0.000000
      </span>
      <div ref={tooltip} className={styles.tooltip} aria-hidden="true" />
      <p className={styles.hint} aria-hidden="true">
        Drag to explore
      </p>
    </div>
  )
}
