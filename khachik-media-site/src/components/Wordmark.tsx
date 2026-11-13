import styles from './Wordmark.module.css'

type Props = {
  className?: string
}

export function Wordmark({ className }: Props) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div className={styles.inner}>
        <img
          className={styles.mark}
          src="/assets/hero-wordmark.svg"
          alt="Khachik Media"
          width={360}
          height={78}
        />
      </div>
      <img
        className={`${styles.corner} ${styles.tl}`}
        src="/assets/wordmark-corner.svg"
        alt=""
        width={8}
        height={8}
      />
      <img
        className={`${styles.corner} ${styles.bl}`}
        src="/assets/wordmark-corner.svg"
        alt=""
        width={8}
        height={8}
      />
      <img
        className={`${styles.corner} ${styles.tr}`}
        src="/assets/wordmark-corner-r.svg"
        alt=""
        width={8}
        height={8}
      />
      <img
        className={`${styles.corner} ${styles.br}`}
        src="/assets/wordmark-corner-r.svg"
        alt=""
        width={8}
        height={8}
      />
    </div>
  )
}
