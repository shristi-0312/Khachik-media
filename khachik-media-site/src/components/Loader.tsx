import { useEffect, useState } from 'react'
import styles from './Loader.module.css'

type Props = {
  onDone: () => void
}

export function Loader({ onDone }: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    let raf = 0
    const start = performance.now()
    const duration = 1400

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const value = Math.round(t * 100)
      setProgress(value)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        frame = window.setTimeout(onDone, 220)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(frame)
    }
  }, [onDone])

  return (
    <div className={styles.loader} aria-live="polite" aria-label="Loading">
      <div className={styles.badge}>
        <span className={styles.text}>{progress}%</span>
        <img className={`${styles.corner} ${styles.tl}`} src="/assets/corner-tl.svg" alt="" width={8} height={8} />
        <img className={`${styles.corner} ${styles.bl}`} src="/assets/corner-tl.svg" alt="" width={8} height={8} />
        <img className={`${styles.corner} ${styles.tr}`} src="/assets/corner-tr.svg" alt="" width={8} height={8} />
        <img className={`${styles.corner} ${styles.br}`} src="/assets/corner-tr.svg" alt="" width={8} height={8} />
      </div>
    </div>
  )
}
