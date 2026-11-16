import { useEffect, useState } from 'react'
import { apiConfigured, fetchMedia } from '../api/client'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import styles from './StillsPage.module.css'

/** Tile spans in a 12-col masonry (desktop composition from Figma 143:4740). */
const TILES: { span: 1 | 2; tall?: boolean }[] = [
  { span: 1, tall: true },
  { span: 2 },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 2 },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 2 },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
  { span: 1, tall: true },
]

const INTRO =
  'Khachik Media is a production house for corporate events, artist events and short-form content. We help brands turn moments into stories their audience remembers and shares.'

export function StillsPage() {
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    if (!apiConfigured()) return
    let cancelled = false
    void (async () => {
      try {
        const items = await fetchMedia('stills')
        if (!cancelled) setUrls(items.map((i) => i.url))
      } catch {
        /* keep empty tiles */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Artboard>
      <div className={styles.page}>
        <Header active="stills" variant="solid" />

        <section className={styles.intro}>
          <p className={styles.eyebrow}>Photography</p>
          <div className={styles.introRow}>
            <h1 className={styles.title}>Stills</h1>
            <p className={styles.body}>{INTRO}</p>
          </div>
        </section>

        <section className={styles.masonry} aria-label="Still photography">
          {TILES.map((tile, i) => {
            const src = urls.length ? urls[i % urls.length] : null
            return (
              <div
                key={i}
                className={`${styles.tile} ${tile.span === 2 ? styles.wide : ''} ${tile.tall ? styles.tall : ''}`}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    loading={i < 4 ? 'eager' : 'lazy'}
                    fetchPriority={i < 2 ? 'high' : i < 4 ? 'auto' : 'low'}
                    decoding="async"
                  />
                ) : null}
              </div>
            )
          })}
        </section>

        <section className={styles.bottom}>
          <ContactStrip />
          <div className={styles.footerWrap}>
            <Footer />
          </div>
        </section>
      </div>
    </Artboard>
  )
}
