import { FIELD, type BoardKind } from './config'

/**
 * A board's place on the flat grid, in whole lattice cells — so its four
 * edges ARE lattice lines, before and after the projection.
 */
export interface Slot {
  id: number
  kind: BoardKind
  /** Left / top edge and size, cells. */
  x: number
  y: number
  w: number
  h: number
  /** The distance round the ball after which the layout repeats, cells. */
  period: number
}

export interface FieldLayout {
  slots: Slot[]
  /** Vertical period, cells. */
  rows: number
  /** Identity of the layout — unchanged across resizes that need no more boards. */
  key: string
}

/**
 * One grid of equal columns and equal gaps.
 *
 * Each band is a row of columns, `pitchX` apart; a column is either one tall
 * board or two landscape boards stacked with the gutter between them — the
 * same height either way — so every gap on the field, across or down, is
 * exactly the gutter. Every `tallEvery`-th column is a tall one, and each band
 * starts the pattern one column further on, so tall boards step diagonally
 * across the field instead of piling up.
 *
 * `minCols` / `minRows` are what the stage can show at once (cells): the
 * periods are rounded UP past them, so a board never appears twice in one
 * frame, and are whole cell counts, so a wrapped copy lands on the gridlines
 * it left.
 */
export function buildLayout(minCols: number, minRows: number): FieldLayout {
  const wide = FIELD.landscape
  const tall = FIELD.portrait
  const gap = FIELD.gutter
  const every = FIELD.tallEvery

  const pitchX = wide.cols + gap
  const pitchY = tall.rows + gap

  // Whole repeats of the tall-column pattern, so it meets itself cleanly at the seam.
  const columns = Math.max(2, Math.ceil(minCols / pitchX / every)) * every
  const bands = Math.max(2, Math.ceil(minRows / pitchY))
  const period = columns * pitchX

  const slots: Slot[] = []
  const add = (kind: BoardKind, x: number, y: number) => {
    const size = kind === 'L' ? wide : tall
    slots.push({ id: slots.length, kind, x, y, w: size.cols, h: size.rows, period })
  }

  for (let b = 0; b < bands; b++) {
    const top = b * pitchY
    for (let i = 0; i < columns; i++) {
      const x = i * pitchX
      if ((i + b) % every === 1) {
        add('P', x, top)
      } else {
        add('L', x, top)
        add('L', x, top + wide.rows + gap)
      }
    }
  }

  return { slots, rows: bands * pitchY, key: `${bands}x${columns}` }
}
