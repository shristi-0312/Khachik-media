import { Link, useParams } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { Footer } from '../components/Footer'
import { getNextProject, getProject } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './ProjectDetailPage.module.css'

export function ProjectDetailPage() {
  const { slug = '' } = useParams()
  const base = useBasePath()
  const project = getProject(slug) ?? getProject('bluorng-x-playboy')!
  const next = getNextProject(project.slug)

  return (
    <Artboard>
      <div className={styles.page}>
        <section className={styles.hero}>
          <Link to={`${base}/projects`} className={styles.back}>
            <img src="/assets/chevron-left-white.svg" alt="" width={6} height={11} />
            <span>Back</span>
          </Link>
          <div className={styles.play}>
            <img src="/assets/play.svg" alt="" width={22} height={24} />
          </div>
        </section>

        <section className={styles.titleBand}>
          <div className={styles.metaRow}>
            <span>{project.client}</span>
            <span>{project.year}</span>
            <span>{project.service}</span>
          </div>
          <h1 className={styles.title}>{project.title}</h1>
        </section>

        <section className={styles.body}>
          {project.description.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </section>

        <section className={styles.gallery}>
          <div className={`${styles.full} ${styles.media}`}>
            <div className={styles.play}>
              <img src="/assets/play.svg" alt="" width={22} height={24} />
            </div>
          </div>
          <div className={styles.pair}>
            <div className={styles.media} />
            <div className={styles.media} />
          </div>
          <div className={styles.triple}>
            <div className={styles.mediaTall} />
            <div className={styles.mediaTall} />
            <div className={styles.mediaTall} />
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.upNext}>
          <div className={`${styles.media} ${styles.upNextMedia}`}>
            <div className={`${styles.play} ${styles.playOffset}`}>
              <img src="/assets/play.svg" alt="" width={22} height={24} />
            </div>
          </div>
          <div className={styles.upNextCopy}>
            <p className={styles.upNextLabel}>Up next</p>
            <h2 className={styles.upNextTitle}>{next.title}</h2>
            <p className={styles.upNextMeta}>
              {next.year} {next.service}
            </p>
            <Link to={`${base}/projects/${next.slug}`} className={styles.viewProject}>
              <span>View project</span>
              <img src="/assets/arrow-union-white.svg" alt="" width={6.207} height={8.354} />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </Artboard>
  )
}
