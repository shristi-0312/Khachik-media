import { useEffect, useRef } from 'react'
import styles from './Loader.module.css'

type Props = {
  onDone: () => void
}

/**
 * Approved Design Home hero wordmark frame: 219×86 at hero center (y=450).
 * % and logo share the same inner 360×78 slot so 100% → Khachik does not jump.
 */
const WIDTH_START = 120
const WIDTH_END = 219
const FRAME_H = 86
const HERO_CENTER_Y = 450
const ARTBOARD = 1470

const COUNT_MS = 2000
const CROSSFADE_MS = 560
const BRAND_HOLD_MS = 480
const EXIT_MS = 700

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function formatPercent(n: number) {
  return `${String(n).padStart(3, '0')}%`
}

function artboardScale() {
  return Math.min(1, window.innerWidth / ARTBOARD)
}

export function Loader({ onDone }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const percentRef = useRef<HTMLSpanElement>(null)
  const brandRef = useRef<HTMLImageElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const badge = badgeRef.current
    if (!badge) return

    const placeBadge = () => {
      const scale = artboardScale()
      badge.style.top = `${HERO_CENTER_Y * scale}px`
      badge.style.transform = 'translate(-50%, -50%)'
    }

    placeBadge()
    window.addEventListener('resize', placeBadge)

    let raf = 0
    let exitTimer = 0
    let finished = false
    const start = performance.now()
    let lastShown = -1

    const tick = (now: number) => {
      const elapsed = now - start
      const percentEl = percentRef.current
      const brandEl = brandRef.current
      if (!percentEl || !brandEl) {
        raf = requestAnimationFrame(tick)
        return
      }

      const countT = Math.min(1, Math.max(0, elapsed / COUNT_MS))
      const countEased = easeInOutCubic(countT)
      const progress = Math.round(countEased * 100)
      const width = WIDTH_START + (WIDTH_END - WIDTH_START) * countEased

      badge.style.width = `${width}px`

      if (progress !== lastShown) {
        lastShown = progress
        percentEl.textContent = formatPercent(progress)
      }

      // Crossfade only after width has fully settled at 219
      const fade = smoothstep((elapsed - COUNT_MS) / CROSSFADE_MS)
      percentEl.style.opacity = String(1 - fade)
      brandEl.style.opacity = String(fade)

      const exitAt = COUNT_MS + CROSSFADE_MS + BRAND_HOLD_MS
      if (elapsed >= exitAt && !finished) {
        finished = true
        percentEl.style.opacity = '0'
        brandEl.style.opacity = '1'
        badge.style.width = `${WIDTH_END}px`
        rootRef.current?.classList.add(styles.exiting)
        exitTimer = window.setTimeout(() => onDoneRef.current(), EXIT_MS)
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(exitTimer)
      window.removeEventListener('resize', placeBadge)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={styles.loader}
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Same geometry as Home <Wordmark /> — fixed to hero center */}
      <div
        ref={badgeRef}
        className={styles.badge}
        style={{ width: WIDTH_START, height: FRAME_H }}
      >
        {/* Shared inner slot (Figma Frame 3: 360×78) — % and logo occupy the same box */}
        <div className={styles.inner}>
          <span ref={percentRef} className={styles.percent}>
            {formatPercent(0)}
          </span>
          <img
            ref={brandRef}
            className={styles.mark}
            src="/assets/hero-wordmark.svg"
            alt=""
            width={360}
            height={78}
            style={{ opacity: 0 }}
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
    </div>
  )
}
