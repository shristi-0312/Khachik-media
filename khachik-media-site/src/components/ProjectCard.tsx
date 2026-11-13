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
}

export function ProjectCard({
  project,
  layout,
  tone = 'gray',
  showPlay = false,
  frameHover = false,
}: Props) {
  const base = useBasePath()

  return (
    <Link
      to={`${base}/projects/${project.slug}`}
      className={`${styles.card} ${layout === 'vertical' ? styles.vertical : styles.horizontal} ${frameHover ? styles.frameHover : ''}`}
    >
      <div
        className={`${styles.media} ${tone === 'red' ? styles.red : styles.gray}`}
      >
        <div className={styles.fill}>
          {project.coverUrl ? (
            project.coverType === 'video' ||
            /\.(mp4|webm|mov)(\?|$)/i.test(project.coverUrl) ? (
              <video
                className={styles.coverMedia}
                src={project.coverUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
            ) : (
              <img className={styles.coverMedia} src={project.coverUrl} alt="" />
            )
          ) : null}
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
    </Link>
  )
}
