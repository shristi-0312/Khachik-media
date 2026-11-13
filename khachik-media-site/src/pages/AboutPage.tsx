import { Link } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ProjectCard } from '../components/ProjectCard'
import { Wordmark } from '../components/Wordmark'
import { useProjects } from '../context/ProjectsContext'
import { ABOUT_BODY } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './AboutPage.module.css'

export function AboutPage() {
  const base = useBasePath()
  const { projects } = useProjects()
  const work = projects.slice(0, 2)

  return (
    <Artboard>
      <div className={styles.page}>
        <Header active="about" />

        <section className={styles.hero}>
          <Wordmark className={styles.wordmark} />
          <p className={styles.kicker}>About us</p>
          <p className={styles.tagline}>
            i think i have a knack of finding good people working with me
          </p>
        </section>

        <p className={styles.label} style={{ top: 1068 }}>
          About Khachik Media
        </p>
        <h2 className={styles.headline} style={{ top: 1100 }}>
          We are all about humane content &amp; holding attention
        </h2>
        <div className={styles.body} style={{ top: 1150 }}>
          {ABOUT_BODY.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        <section className={styles.mediaGrid} aria-label="Featured media">
          <div className={styles.row}>
            <div className={styles.mediaRed}>
              <div className={styles.play}>
                <img src="/assets/play.svg" alt="" width={22} height={24} />
              </div>
            </div>
            <div className={styles.mediaRed}>
              <div className={styles.play}>
                <img src="/assets/play.svg" alt="" width={22} height={24} />
              </div>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.mediaRed} />
            <div className={styles.mediaRed} />
          </div>
          <div className={styles.row}>
            <div className={styles.mediaRed} />
            <div className={styles.mediaRed} />
          </div>
        </section>

        <p className={styles.label} style={{ top: 3026 }}>
          We really love
        </p>
        <h2 className={styles.headline} style={{ top: 3058 }}>
          People with high energy who really wants to stand out
        </h2>
        <div className={styles.body} style={{ top: 3108 }}>
          {ABOUT_BODY.map((p) => (
            <p key={`love-${p.slice(0, 24)}`}>{p}</p>
          ))}
        </div>

        <div className={styles.divider} />

        <div className={styles.ourWorkHead}>
          <span>Our work</span>
          <Link to={`${base}/films`} className={styles.explore}>
            <span>Explore all</span>
            <img src="/assets/arrow-union.svg" alt="" width={6.207} height={8.354} />
          </Link>
        </div>

        <section className={styles.workGrid}>
          {work.map((project, i) => (
            <ProjectCard
              key={`${project.slug}-${i}`}
              project={project}
              layout="horizontal"
              showPlay
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
    </Artboard>
  )
}
