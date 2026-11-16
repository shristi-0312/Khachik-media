import type { ReactNode } from 'react'
import styles from './GlobeScrollStage.module.css'

type Props = {
  children: ReactNode
}

/**
 * One-viewport globe stage — no extra scroll runway.
 * Arrive here, then drag to explore (page scroll still works over the canvas).
 */
export function GlobeScrollStage({ children }: Props) {
  return (
    <section className={styles.track} aria-label="Projects globe">
      <div className={styles.stage}>{children}</div>
    </section>
  )
}
