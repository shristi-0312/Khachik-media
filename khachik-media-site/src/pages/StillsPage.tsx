import { Artboard } from '../components/Artboard'
import { ContactStrip } from '../components/ContactStrip'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import styles from './StillsPage.module.css'

/** Exact visible tile positions from Figma Stills 143:4740. */
const TILES: { left: number; top: number; width: number; height: number }[] = [
  // Block A
  { left: 28, top: 350, width: 345, height: 460 },
  { left: 741, top: 350, width: 701, height: 460 },
  { left: 28, top: 910, width: 345, height: 460 },
  { left: 385, top: 910, width: 344, height: 460 },
  { left: 1098, top: 910, width: 344, height: 460 },
  { left: 384, top: 1470, width: 345, height: 460 },
  { left: 741, top: 1470, width: 345, height: 460 },
  { left: 1098, top: 1470, width: 345, height: 460 },
  // Block B (mirrored — visual positions after Figma flips)
  { left: 29, top: 2030, width: 701, height: 460 },
  { left: 1098, top: 2030, width: 345, height: 460 },
  { left: 29, top: 2590, width: 344, height: 460 },
  { left: 742, top: 2590, width: 344, height: 460 },
  { left: 1098, top: 2590, width: 345, height: 460 },
  { left: 28, top: 3150, width: 345, height: 460 },
  { left: 385, top: 3150, width: 345, height: 460 },
  { left: 742, top: 3150, width: 345, height: 460 },
  // Block A repeat
  { left: 28, top: 3710, width: 345, height: 460 },
  { left: 741, top: 3710, width: 701, height: 460 },
  { left: 28, top: 4270, width: 345, height: 460 },
  { left: 385, top: 4270, width: 344, height: 460 },
  { left: 1098, top: 4270, width: 344, height: 460 },
  { left: 384, top: 4830, width: 345, height: 460 },
  { left: 741, top: 4830, width: 345, height: 460 },
  { left: 1098, top: 4830, width: 345, height: 460 },
]

const INTRO =
  'Khachik Media is a production house for corporate events, artist events and short-form content. We help brands turn moments into stories their audience remembers and shares.'

export function StillsPage() {
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
          {TILES.map((tile, i) => (
            <div
              key={`${tile.left}-${tile.top}-${i}`}
              className={styles.tile}
              style={{
                left: tile.left,
                top: tile.top,
                width: tile.width,
                height: tile.height,
              }}
            />
          ))}
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
