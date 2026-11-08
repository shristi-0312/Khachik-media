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

/** Unique colour identity per board — no short looping palette. */
export function paletteFor(i: number): [string, string, string] {
  const hue = (i * 47 + 13) % 360
  switch (i % 5) {
    case 0:
      return [hsl(hue, 42, 14), hsl(hue, 20, 94), hsl(hue + 40, 85, 55)]
    case 1:
      return [hsl(hue, 45, 88), hsl(hue, 30, 12), hsl(hue + 180, 70, 45)]
    case 2:
      return [hsl(hue, 78, 52), hsl(hue, 15, 98), hsl(hue + 200, 20, 10)]
    case 3:
      return ['#101010', '#f4f2ea', hsl(hue + 30, 90, 55)]
    default:
      return [hsl(hue, 25, 90), hsl(hue, 35, 14), hsl(hue + 25, 82, 48)]
  }
}

export const PALETTES: [string, string, string][] = Array.from({ length: 48 }, (_, i) => paletteFor(i))

export { MEDIA_REELS }

const GLOBE_REELS = MEDIA_REELS
const STILL_COUNT = MEDIA_REELS.length * 3
const stillSrc = (n: number) => `/media/stills/still-${(n % STILL_COUNT) + 1}.jpg`

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
  const n = GLOBE_REELS.length

  const videos: Partial<Record<number, string>> = {}
  const images: Partial<Record<number, string>> = {}
  const aspects: Partial<Record<number, number>> = {}
  for (const t of tiles) aspects[t.tileIndex] = t.aspect

  // Biggest tile always moves; small boards (3 tiles) get one clip, others two.
  const clipCount = tiles.length <= 3 ? 1 : 2
  tiles.slice(0, clipCount).forEach((t, k) => {
    videos[t.tileIndex] = GLOBE_REELS[(i * 5 + k * 7) % n]
  })
  // Next one or two tiles get photo stills; the rest stay graphic.
  const photoCount = tiles.length >= 5 ? 2 : 1
  tiles.slice(clipCount, clipCount + photoCount).forEach((t, k) => {
    images[t.tileIndex] = stillSrc(i * 11 + k * 17)
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
