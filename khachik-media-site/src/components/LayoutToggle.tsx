import styles from './LayoutToggle.module.css'

/** Figma Toggle Frame 34 — fixed equalizer heights */
const BAR_HEIGHTS = [10, 19, 16, 8, 13] as const

type Props = {
  /** Active page index (0-based). Clamped to bar count. */
  index: number
  /** Total pages — active bar walks within this range via PREV / NEXT */
  count: number
  onChange: (index: number) => void
}

export function LayoutToggle({ index, count, onChange }: Props) {
  const pageCount = Math.max(1, count)
  const active = ((index % pageCount) + pageCount) % pageCount

  function go(delta: number) {
    onChange((active + delta + pageCount) % pageCount)
  }

  return (
    <div className={styles.toggle}>
      <button
        type="button"
        className={styles.side}
        onClick={() => go(-1)}
        aria-label="Previous page"
      >
        <img src="/assets/chevron-left.svg" alt="" width={6} height={11} />
        <span>Prev</span>
      </button>

      <div className={styles.bars} aria-hidden="true">
        {BAR_HEIGHTS.map((height, i) => (
          <span
            key={height}
            className={`${styles.bar} ${i === active ? styles.on : ''}`}
            style={{ height }}
          />
        ))}
      </div>

      <button
        type="button"
        className={styles.side}
        onClick={() => go(1)}
        aria-label="Next page"
      >
        <span>Next</span>
        <img
          src="/assets/chevron-left.svg"
          alt=""
          width={6}
          height={11}
          className={styles.flip}
        />
      </button>
    </div>
  )
}
