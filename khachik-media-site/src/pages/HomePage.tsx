import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { LogoMarquee } from '../components/LogoMarquee'
import { Wordmark } from '../components/Wordmark'
import { ABOUT_BODY } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import styles from './HomePage.module.css'

const HomeGlobe = lazy(() =>
  import('../components/HomeGlobe').then((m) => ({ default: m.HomeGlobe })),
)

export function HomePage() {
  const base = useBasePath()

  return (
    <Artboard>
      <div className={styles.page}>
        <Header />
        <section className={styles.hero}>
          <video
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source
              src="https://d1rkq96nxpa3sq.cloudfront.net/media/hero/hero.mp4"
              type="video/mp4"
            />
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
          <div className={styles.heroScrim} aria-hidden="true" />
          <Wordmark className={styles.wordmark} />
          <div className={styles.scrollCue}>
            <p className={styles.scrollLabel}>Scroll down</p>
            <img
              className={styles.scrollIcon}
              src="/assets/scroll-chevron.svg"
              alt=""
              width={32}
              height={32}
            />
          </div>
        </section>

        <section className={styles.marqueeSection} aria-label="Clients">
          <LogoMarquee />
        </section>

        <section className={styles.about}>
          <div className={styles.aboutLeft}>
            <p className={styles.label}>About Khachik Media</p>
            <h2 className={styles.headline}>
              We are all about
              <br />
              humane content &amp;
              <br />
              holding attention
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

        <section className={styles.globeSlot} aria-label="Projects globe">
          <Suspense fallback={<div className={styles.globeFallback} aria-hidden="true" />}>
            <HomeGlobe />
          </Suspense>
          <Link to={`${base}/films`} className={styles.viewAll}>
            View all
          </Link>
        </section>

        <section className={styles.contactSection}>
          <ContactStrip />
        </section>

        <Footer />
      </div>
    </Artboard>
  )
}
