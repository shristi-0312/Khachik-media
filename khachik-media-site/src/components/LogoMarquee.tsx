import { FrameCorners } from './FrameCorners'
import styles from './LogoMarquee.module.css'

const LOGOS = Array.from({ length: 13 }, () => 'LOGO')

export function LogoMarquee() {
  const track = [...LOGOS, ...LOGOS]

  return (
    <div className={styles.frame} aria-label="Client logos">
      <FrameCorners />
      <div className={styles.viewport}>
        <div className={styles.track}>
          {track.map((label, i) => (
            <span key={`${label}-${i}`} className={styles.item}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
