import type { ReactNode } from 'react'
import styles from './GlobeScrollStage.module.css'

/**
 * One-viewport Griflan-style globe stage.
 * Rounding is from the 3D sphere horizon — not CSS border-radius.
 */
export function GlobeScrollStage({ children }: { children: ReactNode }) {
  return (
    <section className={styles.track} aria-label="Projects globe">
      <div className={styles.stage}>{children}</div>
    </section>
  )
}
