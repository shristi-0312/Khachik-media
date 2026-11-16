import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import { FrameCorners } from './FrameCorners'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const isVideo =
    Boolean(project.coverUrl) &&
    (project.coverType === 'video' ||
      /\.(mp4|webm|mov)(\?|$)/i.test(project.coverUrl ?? ''))

  // Warm the first frame when the tile is near the viewport; stay paused.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideo) return

    const warm = () => {
      if (video.preload !== 'auto') {
        video.preload = 'auto'
        video.load()
      }
    }

    const paintFrame = () => {
      if (playing) return
      video.pause()
      // Tiny seek forces a painted poster frame in Safari/Chrome.
      if (video.currentTime < 0.05) video.currentTime = 0.001
    }

    video.addEventListener('loadeddata', paintFrame)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) warm()
      },
      { rootMargin: '160px 0px', threshold: 0.01 },
    )
    io.observe(video)
    return () => {
      io.disconnect()
      video.removeEventListener('loadeddata', paintFrame)
    }
  }, [isVideo, playing, project.coverUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !isVideo) return

    if (playing) {
      if (video.preload !== 'auto') {
        video.preload = 'auto'
        video.load()
      }
      void video.play().catch(() => {})
      return
    }

    video.pause()
    if (video.readyState >= 2) video.currentTime = 0
  }, [playing, isVideo, project.coverUrl])

  if (!project.coverUrl) return null

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        className={styles.coverMedia}
        src={project.coverUrl}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      className={styles.coverMedia}
      src={project.coverUrl}
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
