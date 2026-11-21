import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiConfigured, fetchMedia, mediaToProject, type ApiMediaItem } from '../api/client'
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
import { ResponsiveStill } from '../components/ResponsiveStill'
import { VideoCover } from '../components/VideoCover'
import { videoPosterUrl } from '../media/cdn'
import styles from './AboutPage.module.css'

const WORK_COVERS = ['/media/hq/h1.mp4', '/media/hq/h2.mp4'] as const
const FEATURED_SLOTS = 6

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

function FeaturedTile({
  item,
  onOpenVideo,
}: {
  item: ApiMediaItem | null
  onOpenVideo: (item: ApiMediaItem) => void
}) {
  if (!item) {
    return <div className={styles.mediaRed} aria-hidden="true" />
  }

  const isVideo = item.mediaType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(item.url)

  if (isVideo) {
    const poster = item.posterUrl || videoPosterUrl(item.url) || undefined
    return (
      <button
        type="button"
        className={styles.mediaTile}
        onClick={() => onOpenVideo(item)}
        aria-label={item.title ? `Play ${item.title}` : 'Play video'}
      >
        {/* Poster-first; VideoCover falls back to a metadata frame if poster 403/404s. */}
        <VideoCover
          videoUrl={item.url}
          posterUrl={poster}
          className={styles.mediaAsset}
          playing={false}
        />
        <div className={styles.play}>
          <img src="/assets/play.svg" alt="" width={22} height={24} />
        </div>
      </button>
    )
  }

  return (
    <div className={styles.mediaTile}>
      <ResponsiveStill
        url={item.url}
        thumbUrl={item.thumbUrl}
        srcset={item.srcset}
        alt={item.title || ''}
        className={styles.mediaAsset}
        sizes="(max-width: 719px) 100vw, 50vw"
        loading="lazy"
      />
    </div>
  )
}

export function AboutPage() {
  const base = useBasePath()
  const { projects } = useProjects()
  const [active, setActive] = useState<ActiveVideo | null>(null)
  const [featured, setFeatured] = useState<ApiMediaItem[]>([])

  useEffect(() => {
    if (!apiConfigured()) return
    let cancelled = false
    void (async () => {
      try {
        const items = await fetchMedia('about')
        if (!cancelled) {
          setFeatured(items.filter((i) => i.published !== false && Boolean(i.url)))
        }
      } catch {
        if (!cancelled) setFeatured([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const work = projects.slice(0, 2).map((project, i) => ({
    ...project,
    coverUrl: project.coverUrl ?? WORK_COVERS[i] ?? WORK_COVERS[0],
    coverType: project.coverUrl ? project.coverType : ('video' as const),
  }))

  const tiles: Array<ApiMediaItem | null> = Array.from({ length: FEATURED_SLOTS }, (_, i) => {
    return featured[i] ?? null
  })
  // If more than 6 uploads, show them all in the same 2-col grid.
  const gridItems = featured.length > FEATURED_SLOTS ? featured : tiles

  function openFeaturedVideo(item: ApiMediaItem) {
    setActive({
      project: mediaToProject(item),
      videoUrl: item.url,
    })
  }

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
          {gridItems.map((item, i) => (
            <FeaturedTile
              key={item?.id ?? `empty-${i}`}
              item={item}
              onOpenVideo={openFeaturedVideo}
            />
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
