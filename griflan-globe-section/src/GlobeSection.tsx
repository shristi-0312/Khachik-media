import { useCallback, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PROJECTS, TICKER_ITEMS, type Project } from './data/projects'
import { GLOBE, R } from './globe/config'
import { buildLayout } from './globe/layout'
import { buildAtlas } from './globe/atlas'
import { GlobeScene, type Readout } from './globe/GlobeScene'
import { Header } from './ui/Header'
import { Ticker } from './ui/Ticker'
import { ProjectOverlay } from './ui/ProjectOverlay'

interface Props {
  projects?: Project[]
}

export function GlobeSection({ projects = PROJECTS }: Props) {
  const layout = useMemo(() => buildLayout(projects.length), [projects.length])
  const atlas = useMemo(() => buildAtlas(projects), [projects])

  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

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
        document.body.style.cursor = ''
        return
      }
      const project = projects[layout.clusters[cluster].projectIndex]
      el.textContent = `${project.name} — ${project.category}`
      el.style.transform = `translate(${x + 14}px, ${y + 18}px)`
      el.style.opacity = '1'
      document.body.style.cursor = 'pointer'
    },
    [layout, projects],
  )

  const onSelect = useCallback((cluster: number) => {
    setSelected(cluster)
    setHovered(null)
    const el = tooltip.current
    if (el) el.style.opacity = '0'
    document.body.style.cursor = ''
  }, [])

  const onReadout = useCallback((r: Readout) => {
    if (leftReadout.current) leftReadout.current.textContent = r.left.toFixed(6)
    if (rightReadout.current) rightReadout.current.textContent = r.right.toFixed(6)
  }, [])

  const selectedProjectIndex = selected === null ? null : layout.clusters[selected].projectIndex
  const selectedProject = selectedProjectIndex === null ? null : projects[selectedProjectIndex]

  return (
    <section className="globe-section" style={{ background: GLOBE.bg }}>
      <Header />

      <div className="globe-stage">
        <Canvas
          orthographic
          dpr={[1, 2]}
          camera={{ position: [0, GLOBE.panDefault * R, R * 4], near: 1, far: R * 10, zoom: 1 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor(GLOBE.bg)}
          style={{ touchAction: 'none' }}
        >
          <GlobeScene
            layout={layout}
            atlas={atlas}
            hoveredCluster={hovered}
            onHover={onHover}
            onSelect={onSelect}
            onReadout={onReadout}
            frozen={selected !== null}
          />
        </Canvas>

        <div className="globe-vignette" aria-hidden="true" />

        <span ref={leftReadout} className="readout readout--left">
          0.000000
        </span>
        <span ref={rightReadout} className="readout readout--right">
          0.000000
        </span>

        <div ref={tooltip} className="tooltip" aria-hidden="true" />

        <Ticker items={TICKER_ITEMS} />
      </div>

      <ProjectOverlay
        project={selectedProject}
        projectIndex={selectedProjectIndex}
        atlas={atlas}
        onClose={() => setSelected(null)}
      />

      {/* Accessible, crawlable copy of the projects (the canvas is decorative). */}
      <ul className="sr-only">
        {projects.map((p) => (
          <li key={p.slug}>
            {p.name} — {p.category}
          </li>
        ))}
      </ul>
    </section>
  )
}
