import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Field } from './field'
import type { FieldMedia } from './media'
import type { MediaPool } from './mediaPool'

export interface GlobeSceneProps {
  pool: MediaPool
  /** null until the library (or its fallback) has answered. */
  media: FieldMedia[] | null
  /** False while the stage is off screen: streams stop. */
  active: boolean
  /** Hovered board (or null) and the pointer's place on the stage, on-screen px. */
  onHover: (media: FieldMedia | null, x: number, y: number) => void
  onSelect: (media: FieldMedia) => void
  /** Longitude under the stage's left and right edges, degrees. */
  onReadout: (left: number, right: number) => void
  onCursor: (cursor: 'grab' | 'grabbing' | 'pointer') => void
}

/** Travel before a press becomes a drag, px. */
const DRAG_SLOP = { mouse: 4, touch: 8 }

interface Press {
  id: number
  touch: boolean
  x: number
  y: number
  dragging: boolean
}

/**
 * The R3F side of the field: owns its lifetime, feeds it the canvas size and
 * the pointer, and ticks it. All drawing and hit-testing is in `Field` — the
 * boards are found by inverting the projection, not by raycasting.
 */
export function GlobeScene({
  pool,
  media,
  active,
  onHover,
  onSelect,
  onReadout,
  onCursor,
}: GlobeSceneProps) {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  const field = useMemo(() => new Field(pool), [pool])
  useEffect(() => () => field.dispose(), [field])

  const handlers = useRef({ onHover, onSelect, onReadout, onCursor })
  useEffect(() => {
    handlers.current = { onHover, onSelect, onReadout, onCursor }
  })

  useEffect(() => {
    pool.setAnisotropy(gl.capabilities.getMaxAnisotropy())
  }, [gl, pool])

  useEffect(() => {
    field.resize(size.width, size.height, dpr)
  }, [field, size.width, size.height, dpr])

  useEffect(() => {
    if (media) field.setMedia(media)
  }, [field, media])

  useEffect(() => {
    if (!active) field.suspend()
  }, [field, active])

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia('(pointer: coarse)')
    const sync = () => {
      field.setCalm(calm.matches)
      field.setTouch(coarse.matches)
    }
    sync()
    calm.addEventListener('change', sync)
    coarse.addEventListener('change', sync)
    return () => {
      calm.removeEventListener('change', sync)
      coarse.removeEventListener('change', sync)
    }
  }, [field])

  /* ---------------------------------- input --------------------------------- */
  useEffect(() => {
    const el = gl.domElement
    let press: Press | null = null
    let hovering = false

    const at = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const cursor = () => {
      handlers.current.onCursor(press?.dragging ? 'grabbing' : hovering ? 'pointer' : 'grab')
    }
    const report = (m: FieldMedia | null, x: number, y: number) => {
      hovering = m !== null
      handlers.current.onHover(m, x, y)
      cursor()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || press) return
      press = {
        id: e.pointerId,
        touch: e.pointerType === 'touch',
        x: e.clientX,
        y: e.clientY,
        dragging: false,
      }
    }

    const onMove = (e: PointerEvent) => {
      const p = at(e)
      if (e.pointerType !== 'touch') field.pointerAt(p.x, p.y)

      if (press && e.pointerId === press.id) {
        if (!press.dragging) {
          const dx = e.clientX - press.x
          const dy = e.clientY - press.y
          if (Math.hypot(dx, dy) < (press.touch ? DRAG_SLOP.touch : DRAG_SLOP.mouse)) return
          // A finger heading up or down is scrolling the page (touch-action: pan-y
          // hands it to the browser); only a sideways one turns the field.
          if (press.touch && Math.abs(dy) > Math.abs(dx)) {
            press = null
            return
          }
          press.dragging = true
          // Taken hold of HERE, past the slop, so the field does not lurch to catch up.
          // A mouse moves the rows as well; a finger only turns the ball.
          field.grab(p.x, p.y, !press.touch)
          try {
            el.setPointerCapture(e.pointerId)
          } catch {
            /* synthetic events have no capturable pointer */
          }
          report(null, p.x, p.y)
          return
        }
        field.dragTo(p.x, p.y, performance.now())
        return
      }

      if (e.pointerType !== 'touch') report(field.hover(p.x, p.y), p.x, p.y)
    }

    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      const dragged = press.dragging
      press = null
      if (dragged) {
        field.release(performance.now())
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
        cursor()
        return
      }
      const p = at(e)
      const hit = field.pick(p.x, p.y)
      if (hit) handlers.current.onSelect(hit)
    }

    const onCancel = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return
      if (press.dragging) field.release(performance.now())
      press = null
      cursor()
    }

    const onLeave = (e: PointerEvent) => {
      if (press?.dragging) return
      field.pointerGone()
      const p = at(e)
      report(null, p.x, p.y)
    }

    const onWheel = (e: WheelEvent) => {
      // Vertical wheel is the page's. Only a clearly sideways swipe turns the field.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return
      e.preventDefault()
      field.swipe(e.deltaX * (e.deltaMode === 1 ? 16 : 1))
    }

    cursor()
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('wheel', onWheel)
      if (press?.dragging) field.release(performance.now())
    }
  }, [gl, field])

  /* ---------------------------------- frame --------------------------------- */
  useFrame((_, dt) => {
    pool.warm(gl)
    field.update(Math.min(dt, 0.05), performance.now())
    // The longitudes passing under the stage's left and right edges, read at
    // mid-height — the top corners can lie just off the ball.
    const r = field.readout(size.height * 0.5, 0)
    handlers.current.onReadout(r.left, r.right)
  })

  return <primitive object={field.object} />
}
