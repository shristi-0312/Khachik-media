import { Link } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Wordmark } from '../components/Wordmark'
import { ABOUT_BODY } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './HomePage.module.css'

export function HomePage() {
  const base = useBasePath()

  return (
    <Artboard>
    <div className={styles.page}>
      <Header />
      <section className={styles.hero}>
        <Wordmark className={styles.wordmark} />
        <p className={styles.scrollLabel}>Scroll down</p>
        <img
          className={styles.scrollIcon}
          src="/assets/scroll-chevron.svg"
          alt=""
          width={32}
          height={32}
        />
      </section>

      <section className={styles.about}>
        <div className={styles.aboutLeft}>
          <p className={styles.label}>About Khachik Media</p>
          <h2 className={styles.headline}>
            We are all about humane content & holding attention
          </h2>
        </div>
        <div className={styles.aboutRight}>
          {ABOUT_BODY.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
          <Link to={`${base}/about`} className={styles.more}>
            <span>More about us</span>
            <img src="/assets/arrow-union.svg" alt="" width={6.207} height={8.354} />
          </Link>
        </div>
      </section>

      <section className={styles.globeSlot} aria-label="Projects globe placeholder">
        <Link to={`${base}/projects`} className={styles.viewAll}>
          View all
        </Link>
      </section>

      <Footer />
    </div>
    </Artboard>
  )
}
