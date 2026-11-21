import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import { videoPosterUrl } from '../media/cdn'
import { FrameCorners } from './FrameCorners'
import { VideoCover } from './VideoCover'
import styles from './ProjectCard.module.css'

type Props = {
  project: Project
  layout: 'horizontal' | 'vertical'
  tone?: 'gray' | 'red'
  showPlay?: boolean
  /** Figma Video Frame / Vertical hover — corner reveal + inset */
  frameHover?: boolean
  /** Films grid: open overlay instead of navigating to project detail */
  onOpen?: (project: Project) => void
}

function CoverMedia({
  project,
  playing,
}: {
  project: Project
  playing: boolean
}) {
  const isVideo =
    Boolean(project.coverUrl) &&
    (project.coverType === 'video' ||
      /\.(mp4|webm|mov)(\?|$)/i.test(project.coverUrl ?? ''))

  const poster =
    project.posterUrl ||
    (project.coverUrl ? videoPosterUrl(project.coverUrl) : null) ||
    undefined

  if (!project.coverUrl && !poster) return null

  if (isVideo && project.coverUrl) {
    return (
      <VideoCover
        videoUrl={project.coverUrl}
        posterUrl={poster}
        className={styles.coverMedia}
        playing={playing}
      />
    )
  }

  return (
    <img
      className={styles.coverMedia}
      src={project.coverUrl!}
      alt=""
      loading="lazy"
      decoding="async"
    />
  )
}

function CardBody({
  project,
  tone,
  showPlay,
  frameHover,
}: {
  project: Project
  tone: 'gray' | 'red'
  showPlay: boolean
  frameHover: boolean
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <>
      <div
        className={`${styles.media} ${tone === 'red' ? styles.red : styles.gray}`}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') setPlaying(true)
        }}
        onPointerLeave={() => setPlaying(false)}
      >
        <div className={styles.fill}>
          <CoverMedia project={project} playing={playing} />
        </div>
        {frameHover ? (
          <>
            <div className={styles.hoverBorder} aria-hidden="true" />
            <div className={styles.hoverCorners} aria-hidden="true">
              <FrameCorners />
            </div>
          </>
        ) : null}
        {showPlay ? (
          <div className={styles.play}>
            <img src="/assets/play.svg" alt="" width={22} height={24} />
          </div>
        ) : null}
      </div>
      <div className={styles.meta}>
        <span className={styles.title}>{project.title}</span>
        <span className={styles.date}>{project.date}</span>
      </div>
    </>
  )
}

export function ProjectCard({
  project,
  layout,
  tone = 'gray',
  showPlay = false,
  frameHover = false,
  onOpen,
}: Props) {
  const base = useBasePath()
  const className = `${styles.card} ${layout === 'vertical' ? styles.vertical : styles.horizontal} ${frameHover ? styles.frameHover : ''}`

  if (onOpen) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => onOpen(project)}
      >
        <CardBody
          project={project}
          tone={tone}
          showPlay={showPlay}
          frameHover={frameHover}
        />
      </button>
    )
  }

  return (
    <Link to={`${base}/projects/${project.slug}`} className={className}>
      <CardBody
        project={project}
        tone={tone}
        showPlay={showPlay}
        frameHover={frameHover}
      />
    </Link>
  )
}
