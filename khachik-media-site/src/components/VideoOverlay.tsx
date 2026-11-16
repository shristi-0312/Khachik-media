import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Project } from '../data/content'
import styles from './VideoOverlay.module.css'

type Props = {
  project: Project
  videoUrl: string
  layout: 'horizontal' | 'vertical'
  onClose: () => void
}

export function VideoOverlay({ project, videoUrl, layout, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    const v = videoRef.current
    if (v) void v.play().catch(() => {})
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, videoUrl])

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
    >
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Close video"
      />
      <div
        className={`${styles.stage} ${layout === 'vertical' ? styles.stageVertical : styles.stageHorizontal}`}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <video
          ref={videoRef}
          className={styles.video}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          preload="auto"
        />
        <div className={styles.meta}>
          <p className={styles.title}>{project.title}</p>
          <p className={styles.date}>{project.date}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
