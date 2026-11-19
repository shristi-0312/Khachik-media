import { useEffect, useState } from 'react'
import { apiConfigured, fetchMedia } from '../api/client'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { stillThumbUrl } from '../media/cdn'
import { stillIsWarm, warmStills } from '../media/stillCache'
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
  const [ready, setReady] = useState<Record<string, true>>({})

  useEffect(() => {
    if (!apiConfigured()) return
    let cancelled = false
    void (async () => {
      try {
        const items = await fetchMedia('stills')
        if (cancelled) return
        // Grid uses CDN thumbs (~720px), never multi-MB camera originals.
        const thumbs = items
          .filter((i) => i.mediaType === 'image' && i.url)
          .map((i) => stillThumbUrl(i.url))
        setUrls(thumbs)

        const already: Record<string, true> = {}
        for (const url of thumbs) {
          if (stillIsWarm(url)) already[url] = true
        }
        if (Object.keys(already).length) setReady(already)

        // Warm any thumbs the loader did not finish (client nav / cold boot timeout).
        void warmStills(thumbs).then(() => {
          if (cancelled) return
          const next: Record<string, true> = {}
          for (const url of thumbs) next[url] = true
          setReady(next)
        })
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
            const isReady = src ? Boolean(ready[src]) : false
            return (
              <div
                key={i}
                className={`${styles.tile} ${tile.span === 2 ? styles.wide : ''} ${tile.tall ? styles.tall : ''}`}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    // Eager once warmed — avoids Chrome discarding lazy bitmaps on scroll-away.
                    loading={i < 8 || isReady ? 'eager' : 'lazy'}
                    fetchPriority={i < 2 ? 'high' : i < 4 ? 'auto' : 'low'}
                    decoding="async"
                    className={isReady ? styles.shown : styles.pending}
                    onLoad={() => {
                      setReady((prev) => (prev[src] ? prev : { ...prev, [src]: true }))
                    }}
                    ref={(el) => {
                      // Cached images can complete before onLoad binds.
                      if (!el || isReady) return
                      if (el.complete && el.naturalWidth > 0) {
                        setReady((prev) => (prev[src] ? prev : { ...prev, [src]: true }))
                      }
                    }}
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
