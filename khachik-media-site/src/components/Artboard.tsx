import type { ReactNode } from 'react'
import styles from './Artboard.module.css'

/**
 * Page shell: full-width, no transform scale. Content pages cap themselves
 * with `--content-max`; heroes and the Labs field stay edge-to-edge.
 */
export function Artboard({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>
}
