import { useMemo, useState } from 'react'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { LayoutToggle } from '../components/LayoutToggle'
import { ProjectCard } from '../components/ProjectCard'
import { Wordmark } from '../components/Wordmark'
import { useProjects } from '../context/ProjectsContext'
import { CATEGORIES, type Category } from '../data/content'
import styles from './FilmsPage.module.css'

type Layout = 'horizontal' | 'vertical'

export function FilmsPage() {
  const { projects } = useProjects()
  const [category, setCategory] = useState<Category>('short-forms')
  const [layout, setLayout] = useState<Layout>('vertical')

  /** Figma: 4 sections → 8 horizontal (2×4) or 12 vertical (3×4). */
  const items = useMemo(() => {
    const filtered = projects.filter((p) => p.category === category)
    const source = filtered.length ? filtered : projects
    if (!source.length) return []
    const count = layout === 'vertical' ? 12 : 8
    const out = []
    for (let i = 0; i < count; i += 1) out.push(source[i % source.length])
    return out
  }, [category, projects, layout])

  function onCategory(next: Category) {
    setCategory(next)
    // Short-forms use tall vertical cards; event categories use landscape.
    setLayout(next === 'short-forms' ? 'vertical' : 'horizontal')
  }

  return (
    <Artboard>
      <div className={styles.page}>
        <Header active="films" />
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
              onClick={() => onCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <section
          className={`${styles.grid} ${layout === 'vertical' ? styles.gridVertical : styles.gridHorizontal}`}
          aria-label="Projects"
        >
          {items.map((project, i) => (
            <ProjectCard
              key={`${layout}-${project.slug}-${i}`}
              project={project}
              layout={layout}
              frameHover
            />
          ))}
        </section>

        <div className={styles.toggleWrap}>
          <LayoutToggle layout={layout} onChange={setLayout} />
        </div>

        <section className={styles.contactSection}>
          <ContactStrip />
        </section>

        <Footer />
      </div>
    </Artboard>
  )
}
