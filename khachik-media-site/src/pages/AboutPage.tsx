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

        {/* Figma Hero 118:3443 — 1470×900 */}
        <section className={styles.hero}>
          <Wordmark className={styles.wordmark} />
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>About us</p>
            <p className={styles.tagline}>
              i think i have a knack of finding good people working with me
            </p>
          </div>
        </section>

        {/* About band — label 1068, headline 1100, body 1150 */}
        <p className={`${styles.label} ${styles.labelAbout}`}>About Khachik Media</p>
        <h2 className={`${styles.headline} ${styles.headlineAbout}`}>
          We are all about
          <br />
          humane content &amp;
          <br />
          holding attention
        </h2>
        <div className={`${styles.body} ${styles.bodyAbout}`}>
          {ABOUT_BODY.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        {/* Media grid — 3×2 red tiles starting y=1652 */}
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

        {/* Second copy band — label 3026, headline 3058, body 3108 */}
        <p className={`${styles.label} ${styles.labelLove}`}>We really love</p>
        <h2 className={`${styles.headline} ${styles.headlineLove}`}>
          People with high
          <br />
          energy who really
          <br />
          wants to stand
          <br />
          out
        </h2>
        <div className={`${styles.body} ${styles.bodyLove}`}>
          {ABOUT_BODY.map((p) => (
            <p key={`love-${p.slice(0, 24)}`}>{p}</p>
          ))}
        </div>

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
