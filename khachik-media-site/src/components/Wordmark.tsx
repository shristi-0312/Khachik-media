import styles from './Wordmark.module.css'

type Props = {
  className?: string
}

export function Wordmark({ className }: Props) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div className={styles.inner}>
        <span className={styles.text}>KHACHIK MEDIA</span>
      </div>
      <img className={`${styles.corner} ${styles.tl}`} src="/assets/corner-tl.svg" alt="" width={8} height={8} />
      <img className={`${styles.corner} ${styles.bl}`} src="/assets/corner-tl.svg" alt="" width={8} height={8} />
      <img className={`${styles.corner} ${styles.tr}`} src="/assets/corner-tr.svg" alt="" width={8} height={8} />
      <img className={`${styles.corner} ${styles.br}`} src="/assets/corner-tr.svg" alt="" width={8} height={8} />
    </div>
  )
}
