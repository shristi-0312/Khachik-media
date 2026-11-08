import styles from './LayoutToggle.module.css'

type Props = {
  layout: 'horizontal' | 'vertical'
  onChange: (layout: 'horizontal' | 'vertical') => void
}

export function LayoutToggle({ layout, onChange }: Props) {
  return (
    <div className={styles.toggle}>
      <button
        type="button"
        className={styles.side}
        onClick={() => onChange('horizontal')}
        aria-label="Horizontal layout"
      >
        <img src="/assets/chevron-left.svg" alt="" width={6} height={11} />
        <span>Prev</span>
      </button>
      <button
        type="button"
        className={styles.bars}
        onClick={() =>
          onChange(layout === 'horizontal' ? 'vertical' : 'horizontal')
        }
        aria-label="Toggle layout"
        aria-pressed={layout === 'vertical'}
      >
        <span className={`${styles.bar} ${layout === 'horizontal' ? styles.on : ''}`} style={{ height: 10 }} />
        <span className={`${styles.bar} ${layout === 'vertical' ? styles.on : ''}`} style={{ height: 19 }} />
        <span className={styles.bar} style={{ height: 16 }} />
        <span className={styles.bar} style={{ height: 8 }} />
        <span className={styles.bar} style={{ height: 13 }} />
      </button>
      <button
        type="button"
        className={styles.side}
        onClick={() => onChange('vertical')}
        aria-label="Vertical layout"
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
