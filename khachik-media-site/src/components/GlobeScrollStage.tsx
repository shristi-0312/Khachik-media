import { useEffect, useRef, type ReactNode } from 'react'
import styles from './GlobeScrollStage.module.css'

type Props = {
  children: ReactNode
  /** 0 → section entering, 1 → mostly through. Used for soft-red vignette intensity. */
  onProgress?: (t: number) => void
}

/**
 * One-viewport globe: rounded top (inward), full-width square bottom.
 * Content flows upward into the frame as the section enters view.
 */
export function GlobeScrollStage({ children, onProgress }: Props) {
  const track = useRef<HTMLElement>(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  useEffect(() => {
    const el = track.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add(styles.in)
          io.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el || !onProgressRef.current) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const start = vh * 0.92
      const end = -rect.height * 0.2
      const t = Math.min(1, Math.max(0, (start - rect.top) / (start - end)))
      onProgressRef.current?.(t)
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section ref={track} className={styles.track} aria-label="Projects globe">
      <div className={styles.stage}>{children}</div>
    </section>
  )
}
