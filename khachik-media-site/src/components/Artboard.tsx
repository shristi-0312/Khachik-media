import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Artboard.module.css'

export function Artboard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const next = Math.min(1, window.innerWidth / 1470)
      setScale(next)
      setHeight(el.scrollHeight * next)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className={styles.outer} style={{ height }}>
      <div
        ref={ref}
        className={styles.inner}
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  )
}
