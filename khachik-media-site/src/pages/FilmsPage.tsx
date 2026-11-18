import { useEffect, useMemo, useState } from 'react'
import { apiConfigured, fetchMedia, mediaToProject } from '../api/client'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ProjectCard } from '../components/ProjectCard'
import { VideoOverlay } from '../components/VideoOverlay'
import { Wordmark } from '../components/Wordmark'
import { useProjects } from '../context/ProjectsContext'
import { CATEGORIES, type Category, type Project } from '../data/content'
import styles from './FilmsPage.module.css'

const SECTION_BY_CATEGORY: Record<
  Category,
  'films_short_forms' | 'films_promotional' | 'films_advertisements'
> = {
  'short-forms': 'films_short_forms',
  promotional: 'films_promotional',
  advertisements: 'films_advertisements',
}

type ActiveVideo = {
  project: Project
  videoUrl: string
}

function resolveVideoUrl(project: Project, index: number): string {
  const hero = project.heroUrl
  if (hero && (project.heroType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(hero))) {
    return hero
  }
  const cover = project.coverUrl
  if (cover && (project.coverType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(cover))) {
    return cover
  }
  return `/media/small/reel-${(index % 14) + 1}.mp4`
}

export function FilmsPage() {
  const { projects: fallbackProjects } = useProjects()
  const [category, setCategory] = useState<Category>('short-forms')
  const [library, setLibrary] = useState<Project[] | null>(null)
  const [active, setActive] = useState<ActiveVideo | null>(null)

  useEffect(() => {
    if (!apiConfigured()) {
      setLibrary(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const section = SECTION_BY_CATEGORY[category]
        const items = await fetchMedia(section)
        if (cancelled) return
        setLibrary(items.map(mediaToProject))
      } catch {
        if (!cancelled) setLibrary(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category])

  const items = useMemo(() => {
    const source =
      library && library.length
        ? library
        : fallbackProjects.filter((p) => p.category === category)
    if (!source.length) return []
    // Prefer real library length; pad for local fallback demos.
    if (library && library.length) return source
    const out: Project[] = []
    for (let i = 0; i < 8; i += 1) out.push(source[i % source.length]!)
    return out
  }, [library, fallbackProjects, category])

  function onOpen(project: Project, index: number) {
    setActive({
      project,
      videoUrl: resolveVideoUrl(project, index),
    })
  }

  return (
    <Artboard>
      <div className={styles.page}>
        <Header active="films" />
        <section className={styles.hero}>
          <Wordmark className={styles.wordmark} />
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Work</p>
            <p className={styles.tagline}>
              our curated work done for the market giants and major brands.
            </p>
          </div>
        </section>

        <div className={styles.filters}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.filter} ${category === c.id ? styles.filterActive : ''}`}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <section
          className={`${styles.grid} ${styles.gridHorizontal}`}
          aria-label="Projects"
        >
          {items.map((project, i) => (
            <ProjectCard
              key={`${project.slug}-${i}`}
              project={project}
              layout="horizontal"
              frameHover
              onOpen={() => onOpen(project, i)}
            />
          ))}
        </section>

        <section className={styles.contactSection}>
          <ContactStrip />
        </section>

        <Footer />
      </div>

      {active ? (
        <VideoOverlay
          project={active.project}
          videoUrl={active.videoUrl}
          layout="horizontal"
          onClose={() => setActive(null)}
        />
      ) : null}
    </Artboard>
  )
}
