import type { ReactNode } from 'react'
import styles from './GlobeScrollStage.module.css'

/**
 * One-viewport stage for the Labs field (see globe/config.ts).
 * It only reserves the height; the page scrolls past it as usual.
 */
export function GlobeScrollStage({ children }: { children: ReactNode }) {
  return (
    <section className={styles.track} aria-label="Projects globe">
      <div className={styles.stage}>{children}</div>
    </section>
  )
}
