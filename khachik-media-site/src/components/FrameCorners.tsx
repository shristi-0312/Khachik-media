import styles from './FrameCorners.module.css'

type Props = {
  /** Show the mid-edge ticks used on the footer logo divider */
  showEdges?: boolean
  edgeOffset?: number
}

export function FrameCorners({ showEdges = false, edgeOffset = 400 }: Props) {
  return (
    <>
      <img
        className={`${styles.corner} ${styles.tl}`}
        src="/assets/frame-corner-tl.svg"
        alt=""
        width={8}
        height={8}
      />
      <img
        className={`${styles.corner} ${styles.bl}`}
        src="/assets/frame-corner-tl.svg"
        alt=""
        width={8}
        height={8}
      />
      <img
        className={`${styles.corner} ${styles.tr}`}
        src="/assets/frame-corner-tr.svg"
        alt=""
        width={8}
        height={8}
      />
      <img
        className={`${styles.corner} ${styles.br}`}
        src="/assets/frame-corner-tr.svg"
        alt=""
        width={8}
        height={8}
      />
      {showEdges ? (
        <>
          <span className={styles.edgeTop} style={{ left: edgeOffset }}>
            <img src="/assets/frame-edge-top.svg" alt="" width={8} height={15} />
          </span>
          <span className={styles.edgeBottom} style={{ left: edgeOffset }}>
            <img src="/assets/frame-edge-bottom.svg" alt="" width={8} height={15} />
          </span>
        </>
      ) : null}
    </>
  )
}
