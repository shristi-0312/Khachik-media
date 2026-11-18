import { lazy, Suspense, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { GlobeScrollStage } from '../components/GlobeScrollStage'
import { Header } from '../components/Header'
import { LogoMarquee } from '../components/LogoMarquee'
import { Wordmark } from '../components/Wordmark'
import { ABOUT_BODY, ABOUT_HEADLINE } from '../data/content'
import { useBasePath } from '../hooks/useBasePath'
import { HERO_CDN_URL, HERO_FALLBACK_URL, HERO_POSTER_URL } from '../media/cdn'
import styles from './HomePage.module.css'

const HomeGlobe = lazy(() =>
  import('../components/HomeGlobe').then((m) => ({ default: m.HomeGlobe })),
)

export function HomePage() {
  const base = useBasePath()
  const heroRef = useRef<HTMLVideoElement>(null)

  // After the loader warms the CDN cache, ensure the visible hero starts cleanly.
  useEffect(() => {
    const video = heroRef.current
    if (!video) return
    const tryPlay = () => {
      void video.play().catch(() => {})
    }
    tryPlay()
    video.addEventListener('canplay', tryPlay)
    video.addEventListener('loadeddata', tryPlay)
    return () => {
      video.removeEventListener('canplay', tryPlay)
      video.removeEventListener('loadeddata', tryPlay)
    }
  }, [])

  return (
    <Artboard>
      <div className={styles.page}>
        <Header />
        <section className={styles.hero}>
          <video
            ref={heroRef}
            className={styles.heroVideo}
            data-boot-video="hero"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={HERO_POSTER_URL}
            aria-hidden="true"
          >
            <source src={HERO_CDN_URL} type="video/mp4" />
            <source src={HERO_FALLBACK_URL} type="video/mp4" />
          </video>
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
            <h2 className={styles.headline}>{ABOUT_HEADLINE.join('\n')}</h2>
          </div>
          <div className={styles.aboutRight}>
            {ABOUT_BODY.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
            <Link to={`${base}/about`} className={styles.more}>
              <span>More about us</span>
              <img src="/assets/arrow-union.svg" alt="" width={6.207} height={8.354} />
            </Link>
          </div>
        </section>

        <GlobeScrollStage>
          <div className={styles.globeSlot}>
            <Suspense fallback={<div className={styles.globeFallback} aria-hidden="true" />}>
              <HomeGlobe />
            </Suspense>
            <Link to={`${base}/films`} className={styles.viewAll}>
              View all
            </Link>
          </div>
        </GlobeScrollStage>

        <section className={styles.contactSection}>
          <ContactStrip />
        </section>

        <Footer />
      </div>
    </Artboard>
  )
}
