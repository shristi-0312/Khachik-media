import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ProjectCard } from '../components/ProjectCard'
import { VideoOverlay } from '../components/VideoOverlay'
import { Wordmark } from '../components/Wordmark'
import { useProjects } from '../context/ProjectsContext'
import {
  ABOUT_BODY,
  ABOUT_HEADLINE,
  ABOUT_LOVE_HEADLINE,
  type Project,
} from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './AboutPage.module.css'

const WORK_COVERS = ['/media/hq/h1.mp4', '/media/hq/h2.mp4'] as const

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
  return WORK_COVERS[index % WORK_COVERS.length]!
}

export function AboutPage() {
  const base = useBasePath()
  const { projects } = useProjects()
  const [active, setActive] = useState<ActiveVideo | null>(null)
  const work = projects.slice(0, 2).map((project, i) => ({
    ...project,
    coverUrl: project.coverUrl ?? WORK_COVERS[i] ?? WORK_COVERS[0],
    coverType: project.coverUrl ? project.coverType : ('video' as const),
  }))

  return (
    <Artboard>
      <div className={styles.page}>
        <Header active="about" />

        <section className={styles.hero}>
          <Wordmark className={styles.wordmark} />
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>About us</p>
            <p className={styles.tagline}>
              i think i have a knack of finding good people working with me
            </p>
          </div>
        </section>

        <section className={styles.copyBand} aria-label="About Khachik Media">
          <div className={styles.copyLeft}>
            <p className={styles.label}>About Khachik Media</p>
            <h2 className={styles.headline}>{ABOUT_HEADLINE.join('\n')}</h2>
          </div>
          <div className={styles.body}>
            {ABOUT_BODY.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className={styles.mediaGrid} aria-label="Featured media">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.mediaRed}>
              {i < 2 ? (
                <div className={styles.play}>
                  <img src="/assets/play.svg" alt="" width={22} height={24} />
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <section className={styles.copyBand} aria-label="We really love">
          <div className={styles.copyLeft}>
            <p className={styles.label}>We really love</p>
            <h2 className={styles.headline}>{ABOUT_LOVE_HEADLINE.join('\n')}</h2>
          </div>
          <div className={styles.body}>
            {ABOUT_BODY.map((paragraph) => (
              <p key={`love-${paragraph.slice(0, 24)}`}>{paragraph}</p>
            ))}
          </div>
        </section>

        <div className={styles.divider} />

        <div className={styles.ourWorkHead}>
          <span>Our work</span>
          <Link to={`${base}/films`} className={styles.explore}>
            <span>Explore all</span>
            <img
              src="/assets/arrow-union.svg"
              alt=""
              width={6.207}
              height={8.354}
            />
          </Link>
        </div>

        <section className={styles.workGrid}>
          {work.map((project, i) => (
            <ProjectCard
              key={`${project.slug}-${i}`}
              project={project}
              layout="horizontal"
              showPlay
              onOpen={() =>
                setActive({
                  project,
                  videoUrl: resolveVideoUrl(project, i),
                })
              }
            />
          ))}
        </section>

        <section className={styles.contactSection}>
          <ContactStrip />
        </section>

        <div className={styles.footerWrap}>
          <Footer />
        </div>
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
