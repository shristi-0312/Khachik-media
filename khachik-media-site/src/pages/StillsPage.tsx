import { useEffect, useState } from 'react'
import { apiConfigured, fetchMedia, type ApiMediaItem } from '../api/client'
import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { ResponsiveStill } from '../components/ResponsiveStill'
import { preloadStillLinks, stillDisplayUrl } from '../media/cdn'
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

function displayKey(item: ApiMediaItem): string {
  return item.thumbUrl || stillDisplayUrl(item.url)
}

export function StillsPage() {
  const [items, setItems] = useState<ApiMediaItem[]>([])
  const [ready, setReady] = useState<Record<string, true>>({})

  useEffect(() => {
    if (!apiConfigured()) return
    let cancelled = false
    let removePreloads = () => {}
    void (async () => {
      try {
        const data = await fetchMedia('stills')
        if (cancelled) return
        const images = data.filter((i) => i.mediaType === 'image' && i.url)
        setItems(images)

        const keys = images.map(displayKey)
        removePreloads = preloadStillLinks(keys, 4)

        const already: Record<string, true> = {}
        for (const key of keys) {
          if (stillIsWarm(key)) already[key] = true
        }
        if (Object.keys(already).length) setReady(already)

        void warmStills(keys).then(() => {
          if (cancelled) return
          const next: Record<string, true> = {}
          for (const key of keys) next[key] = true
          setReady(next)
        })
      } catch {
        /* keep empty tiles */
      }
    })()
    return () => {
      cancelled = true
      removePreloads()
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
            const item = items.length ? items[i % items.length]! : null
            const key = item ? displayKey(item) : null
            const isReady = key ? Boolean(ready[key]) : false
            const sizes =
              tile.span === 2
                ? '(max-width: 719px) 100vw, (max-width: 1023px) 100vw, 50vw'
                : '(max-width: 719px) 100vw, (max-width: 1023px) 50vw, 25vw'
            return (
              <div
                key={i}
                className={`${styles.tile} ${tile.span === 2 ? styles.wide : ''} ${tile.tall ? styles.tall : ''}`}
              >
                {item && key ? (
                  <ResponsiveStill
                    url={item.url}
                    thumbUrl={item.thumbUrl}
                    srcset={item.srcset}
                    sizes={sizes}
                    loading={i < 8 || isReady ? 'eager' : 'lazy'}
                    fetchPriority={i < 2 ? 'high' : i < 4 ? 'auto' : 'low'}
                    className={isReady ? styles.shown : styles.pending}
                    onLoad={() => {
                      setReady((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
                    }}
                    imgRef={(el) => {
                      if (!el || isReady) return
                      if (el.complete && el.naturalWidth > 0) {
                        setReady((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
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
