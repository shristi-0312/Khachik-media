import { useEffect, useMemo } from 'react'
import type { Project } from '../data/projects'
import type { Atlas } from '../globe/atlas'
import { CONTENT } from '../data/content'

interface Props {
  project: Project | null
  projectIndex: number | null
  atlas: Atlas
  onClose: () => void
}

export function ProjectOverlay({ project, projectIndex, atlas, onClose }: Props) {
  const open = project !== null && projectIndex !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const images = useMemo(() => {
    if (projectIndex === null) return []
    return Array.from({ length: atlas.tilesPerProject }, (_, i) => atlas.dataUrl(projectIndex, i))
  }, [atlas, projectIndex])

  return (
    <div className={`overlay ${open ? 'overlay--open' : ''}`} aria-hidden={!open}>
      <div className="overlay__scrim" onClick={onClose} />
      <aside className="overlay__panel">
        <button className="overlay__back" type="button" onClick={onClose}>
          ← {CONTENT.backToGlobe}
        </button>
        {project && (
          <>
            <p className="overlay__category">{project.category}</p>
            <h2 className="overlay__title">{project.name}</h2>
            <p className="overlay__tagline">{project.tagline}</p>
            <div className="overlay__grid">
              {images.map((src, i) => (
                <img key={i} src={src} alt="" />
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
