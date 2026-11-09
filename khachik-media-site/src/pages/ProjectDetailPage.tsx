import { Link, useParams } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { Footer } from '../components/Footer'
import { useProjects } from '../context/ProjectsContext'
import type { GalleryItem, MediaType } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './ProjectDetailPage.module.css'

function LoopingVideo({ src, className }: { src: string; className?: string }) {
  return (
    <video
      className={className}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  )
}

function MediaFill({
  url,
  mediaType,
  className,
}: {
  url?: string | null
  mediaType?: MediaType | null
  className?: string
}) {
  if (!url) return null
  if (mediaType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return <LoopingVideo src={url} className={className ?? styles.fillVideo} />
  }
  return <img src={url} alt="" className={className ?? styles.fillVideo} />
}

function galleryBySlot(gallery: GalleryItem[] | undefined, slot: string) {
  return gallery?.find((g) => g.slot === slot)
}

export function ProjectDetailPage() {
  const { slug = '' } = useParams()
  const base = useBasePath()
  const { getProject, getNextProject } = useProjects()
  const project = getProject(slug) ?? getProject('bluorng-x-playboy')!
  const next = getNextProject(project.slug)
  const full = galleryBySlot(project.gallery, 'full')
  const pair1 = galleryBySlot(project.gallery, 'pair-1')
  const pair2 = galleryBySlot(project.gallery, 'pair-2')
  const triple1 = galleryBySlot(project.gallery, 'triple-1')
  const triple2 = galleryBySlot(project.gallery, 'triple-2')
  const triple3 = galleryBySlot(project.gallery, 'triple-3')
  const showHeroMedia = Boolean(project.heroUrl)

  return (
    <Artboard>
      <div className={styles.page}>
        <section className={styles.hero}>
          {showHeroMedia ? (
            <MediaFill
              url={project.heroUrl}
              mediaType={project.heroType}
              className={styles.fillVideo}
            />
          ) : null}
          {showHeroMedia ? <div className={styles.heroScrim} aria-hidden="true" /> : null}
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
            <MediaFill url={full?.url} mediaType={full?.mediaType} />
            <div className={styles.play}>
              <img src="/assets/play.svg" alt="" width={22} height={24} />
            </div>
          </div>
          <div className={styles.pair}>
            <div className={styles.media}>
              <MediaFill url={pair1?.url} mediaType={pair1?.mediaType} />
            </div>
            <div className={styles.media}>
              <MediaFill url={pair2?.url} mediaType={pair2?.mediaType} />
            </div>
          </div>
          <div className={styles.triple}>
            <div className={styles.mediaTall}>
              <MediaFill url={triple1?.url} mediaType={triple1?.mediaType} />
            </div>
            <div className={styles.mediaTall}>
              <MediaFill url={triple2?.url} mediaType={triple2?.mediaType} />
            </div>
            <div className={styles.mediaTall}>
              <MediaFill url={triple3?.url} mediaType={triple3?.mediaType} />
            </div>
          </div>
        </section>

        <div className={styles.divider} />

        <section className={styles.upNext}>
          <div className={`${styles.media} ${styles.upNextMedia}`}>
            <MediaFill url={next.coverUrl ?? next.heroUrl} mediaType={next.coverType ?? next.heroType} />
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
