import * as THREE from 'three'
import { FIELD, rgb, type BoardKind } from './config'
import { buildLayout, type FieldLayout, type Slot } from './layout'
import type { FieldMedia } from './media'
import type { MediaPool, PoolTexture } from './mediaPool'
import { frameFor, project, unproject, wrap, type Frame } from './projection'
import {
  boardFragment,
  boardVertex,
  grainFragment,
  grainVertex,
  latticeFragment,
  latticeVertex,
} from './shaders'

const { damp, clamp } = THREE.MathUtils
const HALF_PI = Math.PI / 2

interface Board {
  slot: Slot
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  media: FieldMedia | null
  /** The still — or, on a reel's board, its poster frame. */
  tex: PoolTexture | null
  /** A reel's running picture, dissolved in over `tex` while it has one. */
  over: PoolTexture | null
  /** A reel whose poster could not be had: a library still stands in for it. */
  bare: boolean
  /** 0 = `tex`, 1 = `over`. */
  mix: number
  opacity: number
  dim: number
  lift: number
  /** This frame: whether any of it is inside the stage, and where its centre landed. */
  onStage: boolean
  sx: number
  sy: number
  facing: number
}

interface Loaded {
  media: FieldMedia
  tex: PoolTexture
  kind: BoardKind
}

const BLANK = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  t.needsUpdate = true
  return t
})()

const FLAT = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  side: THREE.DoubleSide,
} as const

/** Which slots of each shape carry a reel rather than a still, counting along the layout. */
const REEL_SLOTS: { kind: BoardKind; takes: (i: number) => boolean }[] = [
  { kind: 'P', takes: (i) => i % 3 !== 2 },
  { kind: 'L', takes: (i) => i % 6 === 3 },
]

/**
 * The field: one lattice, a board per layout slot, grain over the top.
 *
 * Positions are kept in CELLS (`spin` around the ball, `slide` up it) so a
 * resize rescales the picture instead of scrubbing it. Each frame every board
 * is wrapped to the copy nearest the front, handed its rectangle on the
 * surface, and left to the shared projection in the shaders.
 */
export class Field {
  readonly object = new THREE.Group()

  private frame: Frame = frameFor(1, 1)
  private dpr = 1
  private layout: FieldLayout | null = null
  private boards: Board[] = []
  private hovered: Board | null = null

  /* motion — cells, cells/s. The drawn position chases its target. */
  private spin = 0
  private spinTarget = 0
  private spinVel = 0
  private slide = 0
  private slideTarget = 0
  private slideVel = 0
  private driftDir = 1
  /** How fast the picture is actually moving, smoothed. */
  private speed = 0
  private calm = false
  private liveCap: number = FIELD.maxLiveVideos

  /* the hand, while it holds the surface */
  private dragging = false
  private dragRows = false
  private hand = { x: 0, y: 0 }
  private track: { t: number; spin: number; slide: number }[] = []

  /* pointer wake — stage px */
  private pointer = { x: 0, y: 0, inside: false, strength: 0 }
  private wake: { x: number; y: number; born: number }[] = []
  private readonly trail = new Float32Array(FIELD.trailSamples * 4)

  /* media */
  private media: FieldMedia[] = []
  private loaded: Loaded[] = []
  private requested = new Set<string>()
  private pending = 0
  private generation = 0
  private liveKey = ''
  private liveAt = 0

  /* shared by every material, by reference */
  private readonly uSphere = { value: new THREE.Vector3() }
  private readonly uView = { value: new THREE.Vector2(1, 1) }
  private readonly uGround = { value: new THREE.Vector3(...rgb(FIELD.ground)) }

  private readonly boardGeometry = new THREE.PlaneGeometry(1, 1, 12, 16)
  private readonly lattice: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  private readonly grain: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>
  private readonly pool: MediaPool

  constructor(pool: MediaPool) {
    this.pool = pool

    this.lattice = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 128, 72),
      new THREE.ShaderMaterial({
        ...FLAT,
        vertexShader: latticeVertex,
        fragmentShader: latticeFragment,
        uniforms: {
          uSphere: this.uSphere,
          uView: this.uView,
          uLat: { value: new THREE.Vector2(-1, 0) },
          uPhase: { value: new THREE.Vector2() },
          uCell: { value: 1 },
          uInk: { value: new THREE.Vector3(...rgb(FIELD.ink)) },
          uAccent: { value: new THREE.Vector3(...rgb(FIELD.accent)) },
          uAlpha: { value: FIELD.latticeAlpha },
          uRing: { value: FIELD.ringStrength },
          uHalf: { value: 0.6 },
          uTrail: { value: this.trail },
          uReach: { value: 100 },
        },
      }),
    )
    this.lattice.frustumCulled = false
    this.lattice.renderOrder = 0

    this.grain = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        ...FLAT,
        vertexShader: grainVertex,
        fragmentShader: grainFragment,
        uniforms: {
          uSeed: { value: 0 },
          uAmount: { value: FIELD.grain },
          uScale: { value: 1 },
        },
      }),
    )
    this.grain.frustumCulled = false
    this.grain.renderOrder = 2

    this.object.add(this.lattice, this.grain)
  }

  /* --------------------------------- set-up -------------------------------- */

  resize(w: number, h: number, dpr: number) {
    if (w < 2 || h < 2) return
    const f = frameFor(w, h)
    this.frame = f
    this.dpr = dpr

    this.uSphere.value.set(f.cx, f.cy, f.R)
    this.uView.value.set(w, h)

    const u = this.lattice.material.uniforms
    u.uLat.value.set(Math.max(-HALF_PI, f.vTop - 0.03), Math.min(HALF_PI, f.vBottom + 0.03))
    u.uCell.value = f.cell
    u.uHalf.value = FIELD.lineBase + FIELD.linePerDpr * dpr
    u.uReach.value = FIELD.trailReachCells * f.cell * dpr
    this.grain.material.uniforms.uScale.value = Math.max(1, Math.round(dpr))

    // What the stage can show at once: the whole front of the ball across
    // (the top edge reaches the limb), and the band of latitude between its
    // top and bottom edges — plus a board, so a copy is gone before the next arrives.
    const widest = Math.max(FIELD.landscape.cols, FIELD.portrait.cols)
    const tallest = Math.max(FIELD.landscape.rows, FIELD.portrait.rows)
    const minCols = Math.ceil((Math.PI * f.R) / f.cell) + widest + FIELD.gutter
    const minRows = Math.ceil(((f.vBottom - f.vTop) * f.R) / f.cell) + tallest + FIELD.gutter
    const next = buildLayout(minCols, minRows)
    if (this.layout?.key !== next.key) {
      this.layout = next
      this.buildBoards()
      this.assign()
    }
  }

  setMedia(items: FieldMedia[]) {
    this.generation += 1
    this.media = items
    this.loaded = []
    this.requested.clear()
    this.pending = 0
    if (this.layout) this.assign()
  }

  /** prefers-reduced-motion: no drift, no creep, still grain. */
  setCalm(calm: boolean) {
    this.calm = calm
  }

  setTouch(touch: boolean) {
    this.liveCap = touch ? FIELD.maxLiveVideosTouch : FIELD.maxLiveVideos
  }

  /** Off screen: stop every stream. */
  suspend() {
    this.liveKey = ''
    this.pool.setLive([])
  }

  /* ---------------------------------- input -------------------------------- */

  /**
   * Take hold of the surface at a stage point. `rows` lets the hand move the
   * rows as well as turn the ball (a mouse); without it only sideways counts
   * (a finger, whose up-and-down belongs to the page).
   */
  grab(x: number, y: number, rows: boolean) {
    this.dragging = true
    this.dragRows = rows && FIELD.dragRows
    this.hovered = null
    this.spinVel = 0
    this.slideVel = 0
    // Start from where the field is DRAWN, so taking hold never jumps it.
    this.spinTarget = this.spin
    this.slideTarget = this.slide
    this.hand = { x, y }
    this.track = []
  }

  /**
   * The hand moved to a stage point. The surface point it left is carried to
   * where it is now — read through the projection, so the picture stays under
   * the pointer on the squeezed rows near the top as surely as on the flat ones.
   */
  dragTo(x: number, y: number, now: number) {
    if (!this.dragging) return
    const f = this.frame
    const dx = x - this.hand.x
    const dy = this.dragRows ? y - this.hand.y : 0
    // Sideways only: compare the two points along the row the hand is on now.
    const from = unproject(f, this.hand.x, this.dragRows ? this.hand.y : y)
    const to = unproject(f, x, y)
    this.hand = { x, y }
    if (!dx && !dy) return

    let gx = dx * FIELD.dragGain
    let gy = dy
    if (from && to) {
      gx = to.gx - from.gx
      gy = this.dragRows ? to.gy - from.gy : 0
    }
    // Near the pole and the rim a pixel of hand is a great deal of surface.
    const reach = FIELD.grabMax * Math.hypot(dx, dy)
    const moved = Math.hypot(gx, gy)
    if (moved > reach) {
      gx *= reach / moved
      gy *= reach / moved
    }

    this.spinTarget -= gx / f.cell
    this.slideTarget -= gy / f.cell

    this.track.push({ t: now, spin: this.spinTarget, slide: this.slideTarget })
    while (this.track.length > 2 && now - this.track[0]!.t > FIELD.flingWindowMs) {
      this.track.shift()
    }
  }

  /** Let go. The field keeps the speed the hand had over its last moments — none, if it had stopped. */
  release(now: number) {
    if (!this.dragging) return
    this.dragging = false

    const first = this.track[0]
    const last = this.track[this.track.length - 1]
    let vSpin = 0
    let vSlide = 0
    if (first && last && first !== last && now - last.t < 80) {
      const span = (last.t - first.t) / 1000
      if (span > 0.012) {
        vSpin = (last.spin - first.spin) / span
        vSlide = (last.slide - first.slide) / span
      }
    }
    this.track = []

    const cap = FIELD.maxFling / this.frame.cell
    this.spinVel = clamp(vSpin, -cap, cap)
    this.slideVel = clamp(vSlide, -cap, cap)
    if (Math.abs(this.spinVel) > 0.5) this.driftDir = Math.sign(this.spinVel)
  }

  /** Horizontal wheel / trackpad swipe, px. */
  swipe(dx: number) {
    this.spinTarget += (dx * FIELD.wheelGain) / this.frame.cell
    if (dx) this.driftDir = Math.sign(dx)
  }

  pointerAt(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.inside = true
  }

  pointerGone() {
    this.pointer.inside = false
    this.hovered = null
  }

  /** The board under a stage point, if it is showing a picture. */
  pick(x: number, y: number): FieldMedia | null {
    const hit = this.boardAt(x, y)
    return hit?.media ?? null
  }

  /** As pick(), and that board becomes the hovered one. */
  hover(x: number, y: number): FieldMedia | null {
    this.hovered = this.dragging ? null : this.boardAt(x, y)
    return this.hovered?.media ?? null
  }

  /** Longitude (degrees, ±180) of the field under the stage's left and right edges at height y. */
  readout(y: number, inset: number) {
    const f = this.frame
    const at = (x: number) => {
      const p = unproject(f, x, y)
      const gx = p ? p.gx : Math.sign(x - f.cx) * HALF_PI * f.R
      const deg = ((gx + this.spin * f.cell) / f.R) * (180 / Math.PI)
      return ((((deg + 180) % 360) + 360) % 360) - 180
    }
    return { left: at(inset), right: at(f.w - inset) }
  }

  /* ---------------------------------- frame -------------------------------- */

  update(dt: number, now: number) {
    const f = this.frame
    const layout = this.layout
    if (!layout) return

    /* motion */
    if (!this.dragging) {
      const drift = this.calm ? 0 : (this.driftDir * 2 * Math.PI * f.R) / f.cell / FIELD.driftTurnSec
      // A fling glides off into the idle drift rather than to a stop.
      const rate = Math.abs(this.spinVel) > Math.abs(drift) ? FIELD.flingDecay : 1
      this.spinVel = damp(this.spinVel, drift, rate, dt)
      this.spinTarget += this.spinVel * dt
      this.slideVel = damp(this.slideVel, 0, FIELD.rowDecay, dt)
      this.slideTarget += (this.slideVel + (this.calm ? 0 : FIELD.creepCellsPerSec)) * dt
    }
    // Held, the picture is all but glued to the hand; free, it eases.
    const follow = this.dragging ? FIELD.dragFollow : FIELD.follow
    const spinWas = this.spin
    const slideWas = this.slide
    this.spin = damp(this.spin, this.spinTarget, follow, dt)
    this.slide = damp(this.slide, this.slideTarget, follow, dt)
    if (dt > 0) {
      const v = Math.hypot(this.spin - spinWas, this.slide - slideWas) / dt
      this.speed = damp(this.speed, v, 10, dt)
    }
    const slide = this.slide

    /* lattice */
    const lu = this.lattice.material.uniforms
    lu.uPhase.value.set(this.spin - Math.floor(this.spin), slide - Math.floor(slide))
    this.updateWake(dt, now)

    /* boards */
    const vMid = ((f.vTop + f.vBottom) / 2) * f.R
    const rows = layout.rows * f.cell
    const anyHover = this.hovered !== null
    const mixRate = 3 / FIELD.reelMixSec

    for (const b of this.boards) {
      const { slot, mesh } = b
      const w = slot.w * f.cell
      const h = slot.h * f.cell

      // The copy nearest the front, and nearest the band of latitude on show.
      const gx = wrap((slot.x + slot.w / 2 - this.spin) * f.cell, slot.period * f.cell)
      const gy = wrap((slot.y + slot.h / 2 - slide) * f.cell - vMid, rows) + vMid

      const still = b.tex?.ready === true
      const running = b.over?.ready === true
      const unseen = b.opacity <= 0
      b.opacity =
        still || running
          ? Math.min(1, b.opacity + dt / FIELD.revealSec)
          : Math.max(0, b.opacity - dt / (FIELD.revealSec * 0.6))
      // A reel dissolves in over its poster and back out to it. With no
      // poster there is nothing to dissolve from: it simply is the picture.
      const mixTo = running || !still ? 1 : 0
      b.mix = unseen ? mixTo : damp(b.mix, mixTo, mixRate, dt)

      // On the front of the ball and inside the stage? (Asked of every board,
      // drawn or not: a reel has to be found here before it is ever loaded.)
      b.onStage = false
      if (Math.abs(gx) - w / 2 < HALF_PI * f.R) {
        const tl = project(f, gx - w / 2, gy - h / 2)
        const tr = project(f, gx + w / 2, gy - h / 2)
        const bl = project(f, gx - w / 2, gy + h / 2)
        const br = project(f, gx + w / 2, gy + h / 2)
        const left = Math.min(tl.x, bl.x)
        const right = Math.max(tr.x, br.x)
        b.onStage = bl.y > 0 && tl.y < f.h && right > 0 && left < f.w
      }
      if (b.onStage) {
        const c = project(f, gx, gy)
        b.sx = c.x
        b.sy = c.y
        b.facing = c.facing
      }

      mesh.visible = b.onStage && b.opacity > 0.002
      if (!mesh.visible) continue

      b.lift = damp(b.lift, b === this.hovered ? 1 : 0, 10, dt)
      b.dim = damp(b.dim, anyHover && b !== this.hovered ? FIELD.hoverDim : 0, 8, dt)

      const u = mesh.material.uniforms
      u.uRect.value.set(gx - w / 2, gy - h / 2, w, h)
      u.uOpacity.value = b.opacity * b.opacity * (3 - 2 * b.opacity)
      u.uDim.value = b.dim
      u.uLift.value = b.lift
      u.uMix.value = b.mix
      if (b.tex) {
        u.uMap.value = b.tex.texture
        u.uMapAspect.value = b.tex.aspect
      }
      if (b.over) {
        u.uOver.value = b.over.texture
        u.uOverAspect.value = b.over.aspect
      }
    }

    /* grain — reseeded at film rate, not every frame */
    this.grain.material.uniforms.uSeed.value = this.calm ? 1 : Math.floor(now * 0.024) % 997

    // Starting and stopping streams costs frames: wait until the field has
    // settled. Whatever passes meanwhile shows its poster.
    if (now - this.liveAt > 250 && this.speed < FIELD.settleSpeed) {
      this.liveAt = now
      this.updateLive()
    }
  }

  /**
   * Frees the GPU side. The field stays usable: the next resize() lays it out
   * again from the pool's cache — which is what a dev effect re-run (StrictMode,
   * Fast Refresh) does to the same instance.
   */
  dispose() {
    this.generation += 1
    this.layout = null
    this.loaded = []
    this.requested.clear()
    this.pending = 0
    this.clearBoards()
    this.boardGeometry.dispose()
    this.lattice.geometry.dispose()
    this.lattice.material.dispose()
    this.grain.geometry.dispose()
    this.grain.material.dispose()
  }

  /* -------------------------------- internals ------------------------------ */

  private boardAt(x: number, y: number): Board | null {
    const f = this.frame
    const layout = this.layout
    const p = unproject(f, x, y)
    if (!p || !layout) return null

    const cx = p.gx / f.cell + this.spin
    const cy = p.gy / f.cell + this.slide
    for (const b of this.boards) {
      if (!b.media || b.opacity < 0.5) continue
      const s = b.slot
      if (Math.abs(wrap(cx - (s.x + s.w / 2), s.period)) > s.w / 2) continue
      if (Math.abs(wrap(cy - (s.y + s.h / 2), layout.rows)) > s.h / 2) continue
      return b
    }
    return null
  }

  private updateWake(dt: number, now: number) {
    const p = this.pointer
    const f = this.frame
    p.strength = damp(p.strength, p.inside ? 1 : 0, p.inside ? 12 : 5, dt)

    if (p.inside) {
      const last = this.wake[this.wake.length - 1]
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > f.cell * 0.7) {
        this.wake.push({ x: p.x, y: p.y, born: now })
        if (this.wake.length > FIELD.trailSamples - 1) this.wake.shift()
      }
    }
    const life = FIELD.trailLife * 1000
    while (this.wake.length && now - this.wake[0]!.born > life) this.wake.shift()

    // gl_FragCoord space: device px, origin bottom-left.
    const put = (i: number, x: number, y: number, s: number) => {
      this.trail[i * 4] = x * this.dpr
      this.trail[i * 4 + 1] = (f.h - y) * this.dpr
      this.trail[i * 4 + 2] = s
    }
    put(0, p.x, p.y, p.strength)
    for (let i = 1; i < FIELD.trailSamples; i++) {
      const s = this.wake[i - 1]
      if (!s) {
        put(i, 0, 0, 0)
        continue
      }
      const k = 1 - (now - s.born) / life
      put(i, s.x, s.y, 0.7 * k * k)
    }
  }

  /** The reels nearest the middle of the stage play; the rest wait. */
  private updateLive() {
    const f = this.frame
    const srcs: string[] = []
    const near = this.boards
      .filter((b) => b.media?.kind === 'video' && b.onStage && b.facing > 0.2)
      .sort(
        (a, b) =>
          Math.hypot(a.sx - f.w / 2, a.sy - f.h / 2) - Math.hypot(b.sx - f.w / 2, b.sy - f.h / 2),
      )
    for (const b of near) {
      const src = b.media!.src
      if (!srcs.includes(src)) srcs.push(src)
      if (srcs.length >= this.liveCap) break
    }
    const key = srcs.join('|')
    if (key === this.liveKey) return
    this.liveKey = key
    this.pool.setLive(srcs)
  }

  private buildBoards() {
    this.clearBoards()
    const layout = this.layout
    if (!layout) return

    for (const slot of layout.slots) {
      const material = new THREE.ShaderMaterial({
        ...FLAT,
        vertexShader: boardVertex,
        fragmentShader: boardFragment,
        uniforms: {
          uSphere: this.uSphere,
          uView: this.uView,
          uGround: this.uGround,
          uRect: { value: new THREE.Vector4() },
          uMap: { value: BLANK },
          uOver: { value: BLANK },
          uMapAspect: { value: 0 },
          uOverAspect: { value: 0 },
          uMix: { value: 0 },
          uBoardAspect: { value: slot.w / slot.h },
          uOpacity: { value: 0 },
          uDim: { value: 0 },
          uLift: { value: 0 },
        },
      })
      const mesh = new THREE.Mesh(this.boardGeometry, material)
      mesh.frustumCulled = false
      mesh.renderOrder = 1
      mesh.visible = false
      this.object.add(mesh)
      this.boards.push({
        slot,
        mesh,
        media: null,
        tex: null,
        over: null,
        bare: false,
        mix: 0,
        opacity: 0,
        dim: 0,
        lift: 0,
        onStage: false,
        sx: 0,
        sy: 0,
        facing: 0,
      })
    }
  }

  private clearBoards() {
    for (const b of this.boards) {
      this.object.remove(b.mesh)
      b.mesh.material.dispose()
    }
    this.boards = []
    this.hovered = null
  }

  /** (Re)distribute media over the boards: reels first, then every still already decoded. */
  private assign() {
    for (const b of this.boards) {
      b.media = null
      b.tex = null
      b.over = null
      b.bare = false
      const u = b.mesh.material.uniforms
      u.uMap.value = BLANK
      u.uOver.value = BLANK
    }
    this.placeReels()
    for (const entry of this.loaded) this.place(entry)
    this.requestStills()
    if (this.pending === 0) this.fillRest()
  }

  /**
   * Reels take a spread of the slots of their own shape, and no reel more
   * than two of them. Each board asks for its reel's poster frame, so it has a
   * picture from the start and whenever the reel is not the one running.
   */
  private placeReels() {
    const gen = this.generation
    const reels = this.media.filter((m) => m.kind === 'video')

    for (const { kind, takes } of REEL_SLOTS) {
      const mine = reels.filter((m) => (m.shape ?? 'P') === kind)
      if (!mine.length) continue
      let n = 0
      this.boards
        .filter((b) => b.slot.kind === kind)
        .forEach((b, i) => {
          if (!takes(i) || n >= mine.length * 2) return
          const reel = mine[n++ % mine.length]!
          b.media = reel
          b.over = this.pool.video(reel.src)
          void this.pool.poster(reel.src).then((poster) => {
            if (gen !== this.generation || b.media !== reel) return
            if (poster) {
              b.tex = poster
            } else {
              b.bare = true
              this.cover(b)
            }
          })
        })
    }
  }

  /** A reel with no poster borrows a still, so its board is never an empty hole. */
  private cover(b: Board) {
    if (b.tex || !this.loaded.length) return
    const same = this.loaded.filter((e) => e.kind === b.slot.kind)
    const from = same.length ? same : this.loaded
    b.tex = from[b.slot.id % from.length]!.tex
  }

  private requestStills() {
    const gen = this.generation
    for (const m of this.media) {
      if (m.kind !== 'image' || this.requested.has(m.id)) continue
      this.requested.add(m.id)
      this.pending += 1
      const wanted = () => gen === this.generation && this.boards.some((b) => !b.media)
      void this.pool.loadImage(m.src, wanted).then((tex) => {
        if (gen !== this.generation) return
        this.pending -= 1
        if (tex) {
          const entry: Loaded = { media: m, tex, kind: tex.aspect >= 1 ? 'L' : 'P' }
          this.loaded.push(entry)
          this.place(entry)
        } else {
          this.requested.delete(m.id)
        }
        if (this.pending === 0) this.fillRest()
      })
    }
  }

  /** Give a decoded still the free slot of its own shape nearest what is on screen. */
  private place(entry: Loaded) {
    const f = this.frame
    const layout = this.layout
    if (!layout) return
    const fx = this.spin
    const fy = this.slide + ((f.vTop + f.vBottom) / 2) * (f.R / f.cell)

    let best: Board | null = null
    let bestD = Infinity
    for (const b of this.boards) {
      if (b.media || b.slot.kind !== entry.kind) continue
      const s = b.slot
      const dx = wrap(s.x + s.w / 2 - fx, s.period)
      const dy = wrap(s.y + s.h / 2 - fy, layout.rows)
      const d = dx * dx + dy * dy * 1.5
      if (d < bestD) {
        bestD = d
        best = b
      }
    }
    if (!best) return
    best.media = entry.media
    best.tex = entry.tex
  }

  /** Every still is in: slots still empty repeat the library rather than sit bare. */
  private fillRest() {
    if (!this.loaded.length) return
    const turn: Record<BoardKind, number> = { L: 0, P: 0 }
    for (const b of this.boards) {
      if (b.bare) this.cover(b)
      if (b.media) continue
      const kind = b.slot.kind
      const same = this.loaded.filter((e) => e.kind === kind)
      const from = same.length ? same : this.loaded
      const entry = from[turn[kind]++ % from.length]!
      b.media = entry.media
      b.tex = entry.tex
    }
  }
}
