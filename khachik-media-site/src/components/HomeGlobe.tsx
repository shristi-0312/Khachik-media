import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { apiConfigured, fetchMedia } from '../api/client'
import { GLOBE, R } from '../globe/config'
import { GlobeScene, type Readout } from '../globe/GlobeScene'
import { buildLayout } from '../globe/layout'
import { buildGlobeProjects, PROJECTS, type Project as GlobeProject } from '../globe/projects'
import { buildVideoPool, type VideoPool } from '../globe/videoPool'
import { useBasePath } from '../hooks/useBasePath'
import styles from './HomeGlobe.module.css'

/** Interactive globe only — no Studio Labs chrome. */
export function HomeGlobe() {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [videos, setVideos] = useState<VideoPool | null>(null)
  const [globeProjects, setGlobeProjects] = useState<GlobeProject[]>(PROJECTS)
  const navigate = useNavigate()
  const base = useBasePath()

  useLayoutEffect(() => {
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
  }, [])

  // Load CloudFront HQ clips when the API is configured; else keep local stock.
  useEffect(() => {
    if (!apiConfigured()) return
    let cancelled = false
    void (async () => {
      try {
        const [hItems, vItems] = await Promise.all([
          fetchMedia('globe_horizontal'),
          fetchMedia('globe_vertical'),
        ])
        if (cancelled) return
        const h = hItems.map((i) => i.url)
        const v = vItems.map((i) => i.url)
        if (h.length || v.length) {
          setGlobeProjects(buildGlobeProjects(h.length ? h : undefined, v.length ? v : undefined))
        }
      } catch {
        /* keep local fallbacks */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Native VideoTextures so uploaded HQ stays sharp on large frames.
  useEffect(() => {
    const next = buildVideoPool()
    setVideos(next)
    return () => {
      next.dispose()
      setVideos(null)
    }
  }, [globeProjects])

  const layout = useMemo(() => buildLayout(globeProjects.length), [globeProjects.length])
  const [hovered, setHovered] = useState<number | null>(null)

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
      style={{ cursor: hovered !== null ? 'pointer' : 'grab' }}
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

      <div className={styles.vignette} aria-hidden="true" />
      <span ref={leftReadout} className={`${styles.readout} ${styles.readoutLeft}`}>
        0.000000
      </span>
      <span ref={rightReadout} className={`${styles.readout} ${styles.readoutRight}`}>
        0.000000
      </span>
      <div ref={tooltip} className={styles.tooltip} aria-hidden="true" />
    </div>
  )
}
