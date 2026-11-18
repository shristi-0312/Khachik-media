import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { bootCriticalMedia } from '../media/bootMedia'
import styles from './Loader.module.css'

type Props = {
  onDone: () => void
}

/**
 * Hero wordmark frame: 219×86, centered on the viewport (matches 50%-tall heroes).
 *
 * Layering (front → back):
 *   1. Khachik Media badge — viewport-fixed, never moves, always on top
 *   2. Red shutter — slides up on exit
 *   3. Home page (hero / video) — already painted underneath
 *
 * Progress is driven by real CDN asset boot (hero / above-fold media), with a
 * short brand beat so the shutter never pops before the wordmark lands.
 */
const WIDTH_START = 120
const WIDTH_END = 219
const FRAME_H = 86

const COUNT_MS = 900
const CROSSFADE_MS = 280
const BRAND_HOLD_MS = 120
const EXIT_MS = 400

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

export function Loader({ onDone }: Props) {
  const location = useLocation()
  const shutterRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const percentRef = useRef<HTMLSpanElement>(null)
  const brandRef = useRef<HTMLImageElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const assetRatioRef = useRef(0)
  const assetsReadyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    void bootCriticalMedia(location.pathname, (ratio) => {
      if (cancelled) return
      assetRatioRef.current = ratio
      if (ratio >= 0.99) assetsReadyRef.current = true
    }).then(() => {
      if (!cancelled) {
        assetRatioRef.current = 1
        assetsReadyRef.current = true
      }
    })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    const badge = badgeRef.current
    if (!badge) return

    const placeBadge = () => {
      // Match hero wordmark at 50% of the viewport-tall hero.
      badge.style.top = `${window.innerHeight / 2}px`
      badge.style.left = '50%'
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
      // Never claim 100% until CDN boot is ready; never lag too far behind assets.
      const blended = Math.max(countEased * 0.92, assetRatioRef.current)
      const progress = Math.round(Math.min(assetsReadyRef.current ? 100 : 99, blended * 100))
      const width = WIDTH_START + (WIDTH_END - WIDTH_START) * Math.min(1, blended)

      badge.style.width = `${width}px`

      if (progress !== lastShown) {
        lastShown = progress
        percentEl.textContent = formatPercent(progress)
      }

      const fade = smoothstep((elapsed - COUNT_MS) / CROSSFADE_MS)
      percentEl.style.opacity = String(1 - fade)
      brandEl.style.opacity = String(fade)

      const brandAt = COUNT_MS + CROSSFADE_MS + BRAND_HOLD_MS
      const canExit = elapsed >= brandAt && assetsReadyRef.current
      if (canExit && !finished) {
        finished = true
        percentEl.style.opacity = '0'
        brandEl.style.opacity = '1'
        badge.style.width = `${WIDTH_END}px`
        // Badge stays put + on top. Only the red shutter moves.
        shutterRef.current?.classList.add(styles.exiting)
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

  const badge = (
    <div
      ref={badgeRef}
      className={styles.badge}
      data-loader-badge="1"
      style={{ width: WIDTH_START, height: FRAME_H }}
    >
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
  )

  return (
    <>
      {/* Back layer — red only; slides away on exit */}
      <div className={styles.root} aria-live="polite" aria-label="Loading">
        <div ref={shutterRef} className={styles.shutter} aria-hidden="true" />
      </div>
      {/* Front layer — Khachik Media; fixed, never translates with shutter */}
      {createPortal(badge, document.body)}
    </>
  )
}
