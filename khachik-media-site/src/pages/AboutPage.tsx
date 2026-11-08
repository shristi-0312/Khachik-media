import { Link } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ProjectCard } from '../components/ProjectCard'
import { Wordmark } from '../components/Wordmark'
import { ABOUT_BODY, PROJECTS } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './AboutPage.module.css'

export function AboutPage() {
  const base = useBasePath()
  const work = PROJECTS.slice(0, 2)

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

      <section className={styles.split}>
        <div>
          <p className={styles.label}>About Khachik Media</p>
          <h2 className={styles.headline}>
            We are all about humane content & holding attention
          </h2>
        </div>
        <div className={styles.body}>
          {ABOUT_BODY.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </section>

      <section className={styles.mediaGrid}>
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

      <section className={`${styles.split} ${styles.splitSecond}`}>
        <div>
          <p className={styles.label}>We really love</p>
          <h2 className={styles.headline}>
            People with high energy who really wants to stand out
          </h2>
        </div>
        <div className={styles.body}>
          {ABOUT_BODY.map((p) => (
            <p key={`love-${p.slice(0, 24)}`}>{p}</p>
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      <section className={styles.ourWork}>
        <div className={styles.ourWorkHead}>
          <span>Our work</span>
          <Link to={`${base}/projects`} className={styles.explore}>
            <span>Explore all</span>
            <img src="/assets/arrow-union.svg" alt="" width={6.207} height={8.354} />
          </Link>
        </div>
        <div className={styles.workGrid}>
          {work.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              layout="horizontal"
              showPlay
            />
          ))}
        </div>
      </section>

      <Footer />
    </div>
    </Artboard>
  )
}
