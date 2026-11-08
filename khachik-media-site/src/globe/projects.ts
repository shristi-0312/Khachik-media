import {
  MEDIA_REELS,
  PROJECTS as SITE_PROJECTS,
  type Category,
} from '../data/content'
import { boardTiles } from './layout'

export interface Project {
  slug: string
  name: string
  category: string
  tagline: string
  /** Photo stills by tile index. */
  images?: Partial<Record<number, string>>
  /** Looping clips by tile index. */
  videos?: Partial<Record<number, string>>
  /** Real width / height of each tile on the sphere, so atlas art isn't stretched. */
  aspects?: Partial<Record<number, number>>
  palette?: [string, string, string]
  /** Seed for which graphic variants appear inside this board. */
  artSeed: number
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`
}

/**
 * Section hues — analogous only (no complementary accents).
 * Neighbours on the sphere land on different families so boards read as
 * teal / red / amber / green / cobalt / coral / plum / olive blocks.
 */
const HUE_FAMILIES = [
  178, // teal
  6, // red
  44, // amber / yellow
  148, // green
  214, // cobalt
  18, // coral
  292, // plum
  78, // olive
] as const

/** One cohesive [bg, fg, accent] per board, all in the same hue family. */
export function paletteFor(i: number): [string, string, string] {
  const hue = HUE_FAMILIES[i % HUE_FAMILIES.length]! + ((i * 3) % 9) - 4
  switch (Math.floor(i / HUE_FAMILIES.length) % 3) {
    case 0: // dark field
      return [hsl(hue, 36, 11), hsl(hue, 14, 96), hsl(hue, 62, 48)]
    case 1: // light field
      return [hsl(hue, 26, 93), hsl(hue, 38, 14), hsl(hue, 58, 42)]
    default: // accent field
      return [hsl(hue, 58, 44), hsl(hue, 18, 98), hsl(hue, 32, 12)]
  }
}

export const PALETTES: [string, string, string][] = Array.from({ length: 48 }, (_, i) => paletteFor(i))

export { MEDIA_REELS }

/**
 * Usable unique clips only.
 * Dropped: 4/5/13 (rainbow test patterns), 7 (duplicate of 1).
 * Colour wash keeps the rest inside each board's hue family.
 */
const GLOBE_REELS = [
  '/media/small/reel-1.mp4',
  '/media/small/reel-2.mp4',
  '/media/small/reel-3.mp4',
  '/media/small/reel-6.mp4',
  '/media/small/reel-8.mp4',
  '/media/small/reel-9.mp4',
  '/media/small/reel-10.mp4',
  '/media/small/reel-11.mp4',
  '/media/small/reel-12.mp4',
  '/media/small/reel-14.mp4',
] as const

/** Stills from those same reels (3 frames each). */
const GLOBE_STILLS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 40, 41, 42,
]
const stillSrc = (n: number) =>
  `/media/stills/still-${GLOBE_STILLS[((n % GLOBE_STILLS.length) + GLOBE_STILLS.length) % GLOBE_STILLS.length]!}.jpg`

/** Pick clips so a board never shows the same reel twice, and neighbours differ. */
function clipFor(board: number, slot: number, taken: number[] = []) {
  const n = GLOBE_REELS.length
  let idx = (board * 3 + slot * 5 + 1) % n
  for (let step = 0; step < n; step++) {
    const cand = (idx + step) % n
    if (!taken.includes(cand)) return cand
  }
  return idx
}

const CATEGORY_LABEL: Record<Category, string> = {
  promotional: 'Promotional',
  corporate: 'Corporate',
  advertisements: 'Ads',
  'short-forms': 'Short-form',
}

/** Matches the sphere grid (gridCols × gridRows) so board i is project i. */
const GLOBE_COUNT = 50

export const PROJECTS: Project[] = Array.from({ length: GLOBE_COUNT }, (_, i) => {
  const site = SITE_PROJECTS[i % SITE_PROJECTS.length]
  const tiles = boardTiles(i)

  const videos: Partial<Record<number, string>> = {}
  const images: Partial<Record<number, string>> = {}
  const aspects: Partial<Record<number, number>> = {}
  for (const t of tiles) aspects[t.tileIndex] = t.aspect

  // Biggest tile always moves; small boards (3 tiles) get one clip, others two.
  const clipCount = tiles.length <= 3 ? 1 : 2
  const usedClips: number[] = []
  tiles.slice(0, clipCount).forEach((t, k) => {
    const idx = clipFor(i, k, usedClips)
    usedClips.push(idx)
    videos[t.tileIndex] = GLOBE_REELS[idx]!
  })
  // Photos from a different reel than this board's clips, so tiles don't rhyme.
  const photoCount = tiles.length >= 5 ? 2 : 1
  tiles.slice(clipCount, clipCount + photoCount).forEach((t, k) => {
    const stillReel = clipFor(i, k + 2, usedClips)
    images[t.tileIndex] = stillSrc(stillReel * 3 + k)
  })

  return {
    slug: site.slug,
    name: site.title,
    category: CATEGORY_LABEL[site.category],
    tagline: site.service,
    palette: paletteFor(i),
    artSeed: (i * 2654435761) >>> 0,
    videos,
    images,
    aspects,
  }
})

export const TICKER_ITEMS = SITE_PROJECTS.map(
  (p) => `${p.title} — ${p.client}`,
)
