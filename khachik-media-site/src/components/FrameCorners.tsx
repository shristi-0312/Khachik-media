import styles from './FrameCorners.module.css'

type Props = {
  /** Show the mid-edge ticks used on the footer logo divider */
  showEdges?: boolean
  edgeOffset?: number
  /** Black on light surfaces (default); white for dark hero wordmarks */
  tone?: 'black' | 'white'
}

export function FrameCorners({
  showEdges = false,
  edgeOffset = 400,
  tone = 'black',
}: Props) {
  const toneClass = tone === 'white' ? styles.white : styles.black

  return (
    <>
      <span className={`${styles.corner} ${styles.tl} ${toneClass}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.tr} ${toneClass}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bl} ${toneClass}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.br} ${toneClass}`} aria-hidden="true" />
      {showEdges ? (
        <>
          <span
            className={`${styles.edge} ${styles.edgeTop} ${toneClass}`}
            style={{ left: edgeOffset }}
            aria-hidden="true"
          />
          <span
            className={`${styles.edge} ${styles.edgeBottom} ${toneClass}`}
            style={{ left: edgeOffset }}
            aria-hidden="true"
          />
        </>
      ) : null}
    </>
  )
}
