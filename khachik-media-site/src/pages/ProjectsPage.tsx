import { useMemo, useState } from 'react'
import { Artboard } from '../components/Artboard'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { LayoutToggle } from '../components/LayoutToggle'
import { ProjectCard } from '../components/ProjectCard'
import { Wordmark } from '../components/Wordmark'
import { CATEGORIES, PROJECTS, type Category } from '../data/content'
import styles from './ProjectsPage.module.css'

export function ProjectsPage() {
  const [category, setCategory] = useState<Category>('promotional')
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal')

  // Figma: Short-forms uses the vertical / portrait grid (3 cols)
  const effectiveLayout =
    category === 'short-forms' ? 'vertical' : layout

  const items = useMemo(() => {
    const filtered = PROJECTS.filter((p) => p.category === category)
    const source = filtered.length ? filtered : PROJECTS
    // Match Figma density: fill grid with repeats of available work
    const count = effectiveLayout === 'horizontal' ? 8 : 12
    const out = []
    for (let i = 0; i < count; i += 1) out.push(source[i % source.length])
    return out
  }, [category, effectiveLayout])

  function selectCategory(next: Category) {
    setCategory(next)
    if (next === 'short-forms') setLayout('vertical')
    else if (category === 'short-forms') setLayout('horizontal')
  }

  return (
    <Artboard>
    <div className={styles.page}>
      <Header active="projects" />
      <section className={styles.hero}>
        <Wordmark className={styles.wordmark} />
        <p className={styles.kicker}>Work</p>
        <p className={styles.tagline}>
          our curated work done for the market giants and major brands.
        </p>
      </section>

      <div className={styles.filters}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.filter} ${category === c.id ? styles.filterActive : ''}`}
            onClick={() => selectCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section
        className={`${styles.grid} ${effectiveLayout === 'vertical' ? styles.gridVertical : styles.gridHorizontal}`}
      >
        {items.map((project, i) => (
          <ProjectCard
            key={`${project.slug}-${i}`}
            project={project}
            layout={effectiveLayout}
          />
        ))}
      </section>

      <div className={styles.toggleWrap}>
        <LayoutToggle
          layout={effectiveLayout}
          onChange={(next) => {
            if (category === 'short-forms') return
            setLayout(next)
          }}
        />
      </div>

      <Footer />
    </div>
    </Artboard>
  )
}
