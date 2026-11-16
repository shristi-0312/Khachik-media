import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { apiConfigured, fetchMedia } from '../api/client'
import { FIELD } from '../globe/config'
import { GlobeScene } from '../globe/GlobeScene'
import { fromLibrary, localFallback, type FieldMedia } from '../globe/media'
import { createMediaPool, type MediaPool } from '../globe/mediaPool'
import { useBasePath } from '../hooks/useBasePath'
import styles from './HomeGlobe.module.css'

/** How long the library may take before bundled stills stand in for it. */
const LIBRARY_TIMEOUT_MS = 3500
/** Stills decoded as soon as the library answers, before the stage is near. */
const EAGER_STILLS = 24
/** The canvas is made a screen ahead of the stage, so it is ready before it is seen… */
const MOUNT_MARGIN = '100% 0px'
/** …and frames and streams run only within this distance of the viewport, px. */
const NEAR_PX = 320

/**
 * Home "Labs" stage — a field of lattice lines with one still or reel per
 * board, after labs.griflan.com. See globe/config.ts for the model.
 */
export function HomeGlobe() {
  const host = useRef<HTMLDivElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const leftReadout = useRef<HTMLSpanElement>(null)
  const rightReadout = useRef<HTMLSpanElement>(null)

  const [pool, setPool] = useState<MediaPool | null>(null)
  const [media, setMedia] = useState<FieldMedia[] | null>(null)
  /** Has the stage ever been within a screen of the viewport (the canvas stays once made). */
  const [mounted, setMounted] = useState(false)
  /** Is it near right now, in a visible tab (frames and streams run only then). */
  const [near, setNear] = useState(false)
  const [tabVisible, setTabVisible] = useState(() => !document.hidden)

  const navigate = useNavigate()
  const base = useBasePath()

  useEffect(() => {
    const next = createMediaPool()
    setPool(next)
    return () => {
      next.dispose()
      setPool(null)
    }
  }, [])

  /* The library — production API via VITE_API_URL — or the bundled fallback. */
  useEffect(() => {
    let cancelled = false
    let fromApi = false
    const fallback = () => {
      if (!cancelled && !fromApi) setMedia((prev) => prev ?? localFallback())
    }

    if (!apiConfigured()) {
      fallback()
      return
    }

    const timer = window.setTimeout(fallback, LIBRARY_TIMEOUT_MS)
    fetchMedia()
      .then((all) => {
        if (cancelled) return
        const library = fromLibrary(all)
        if (!library.length) return fallback()
        fromApi = true
        // An empty or stills-less library never blanks the field.
        const hasStills = library.some((m) => m.kind === 'image')
        setMedia(
          hasStills ? library : [...localFallback().filter((m) => m.kind === 'image'), ...library],
        )
      })
      .catch(fallback)
      .finally(() => window.clearTimeout(timer))

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  /* Start on the first stills straight away: they are small, and already in the HTTP cache after the loader. */
  useEffect(() => {
    if (!pool || !media) return
    for (const m of media.filter((x) => x.kind === 'image').slice(0, EAGER_STILLS)) {
      void pool.loadImage(m.src)
    }
  }, [pool, media])

  useEffect(() => {
    const el = host.current
    if (!el) return
    // A callback can carry several records for the one element (a quick
    // scroll past and back, a busy main thread): only the LAST is the present.
    const ahead = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        setMounted(true)
        ahead.disconnect()
      },
      { rootMargin: MOUNT_MARGIN },
    )
    const close = new IntersectionObserver(
      (entries) => setNear(Boolean(entries[entries.length - 1]?.isIntersecting)),
      { rootMargin: `${NEAR_PX}px 0px` },
    )
    ahead.observe(el)
    close.observe(el)
    // A viewport change (rotation, a window resize) is measured directly as
    // well, rather than left to the observers alone.
    const onResize = () => {
      const r = el.getBoundingClientRect()
      const on = r.bottom > -NEAR_PX && r.top < window.innerHeight + NEAR_PX
      setNear(on)
      if (on) setMounted(true)
    }
    window.addEventListener('resize', onResize)
    const onVisibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      ahead.disconnect()
      close.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const active = near && tabVisible

  const onHover = useCallback((item: FieldMedia | null, x: number, y: number) => {
    const el = tooltip.current
    if (!el) return
    if (!item) {
      el.style.opacity = '0'
      return
    }
    if (el.textContent !== item.label) el.textContent = item.label
    el.style.transform = `translate(${x + 14}px, ${y + 18}px)`
    el.style.opacity = '1'
  }, [])

  const onSelect = useCallback(
    (item: FieldMedia) => navigate(`${base}/${item.page}`),
    [navigate, base],
  )

  const onCursor = useCallback((cursor: string) => {
    if (host.current) host.current.style.cursor = cursor
  }, [])

  const onReadout = useCallback((left: number, right: number) => {
    const l = left.toFixed(6)
    const r = right.toFixed(6)
    if (leftReadout.current && leftReadout.current.textContent !== l) {
      leftReadout.current.textContent = l
    }
    if (rightReadout.current && rightReadout.current.textContent !== r) {
      rightReadout.current.textContent = r
    }
  }, [])

  return (
    <div ref={host} className={styles.stage}>
      {mounted && pool ? (
        <Canvas
          flat
          dpr={[1, 2]}
          frameloop={active ? 'always' : 'never'}
          gl={{
            antialias: true,
            alpha: false,
            depth: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => gl.setClearColor(FIELD.ground)}
          style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
        >
          <GlobeScene
            pool={pool}
            media={media}
            active={active}
            onHover={onHover}
            onSelect={onSelect}
            onReadout={onReadout}
            onCursor={onCursor}
          />
        </Canvas>
      ) : null}

      <div className={styles.vignette} aria-hidden="true" />
      <span ref={leftReadout} className={`${styles.readout} ${styles.readoutLeft}`}>
        0.000000
      </span>
      <span ref={rightReadout} className={`${styles.readout} ${styles.readoutRight}`}>
        0.000000
      </span>
      <div ref={tooltip} className={styles.tooltip} aria-hidden="true" />
      <p className={styles.hint} aria-hidden="true">
        Drag to explore
      </p>
    </div>
  )
}
