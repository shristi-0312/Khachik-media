import {
  PROJECTS as SITE_PROJECTS,
  type Category,
} from '../data/content'
import { boardTiles, orientationForCluster } from './layout'

export interface Project {
  slug: string
  name: string
  category: string
  tagline: string
  /** Photo stills by tile index. */
  images?: Partial<Record<number, string>>
  /** Looping clips by tile index — one video per board. */
  videos?: Partial<Record<number, string>>
  /** Real width / height of each tile on the sphere, so atlas art isn't stretched. */
  aspects?: Partial<Record<number, number>>
  palette?: [string, string, string]
  /** Seed for which graphic variants appear inside this board. */
  artSeed: number
  orientation: 'horizontal' | 'vertical'
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`
}

const HUE_FAMILIES = [
  178, 6, 44, 148, 214, 18, 292, 78,
] as const

/** One cohesive [bg, fg, accent] per board, all in the same hue family. */
export function paletteFor(i: number): [string, string, string] {
  const hue = HUE_FAMILIES[i % HUE_FAMILIES.length]! + ((i * 3) % 9) - 4
  switch (Math.floor(i / HUE_FAMILIES.length) % 3) {
    case 0:
      return [hsl(hue, 36, 11), hsl(hue, 14, 96), hsl(hue, 62, 48)]
    case 1:
      return [hsl(hue, 26, 93), hsl(hue, 38, 14), hsl(hue, 58, 42)]
    default:
      return [hsl(hue, 58, 44), hsl(hue, 18, 98), hsl(hue, 32, 12)]
  }
}

export const PALETTES: [string, string, string][] = Array.from({ length: 48 }, (_, i) => paletteFor(i))

/** Local HQ fallbacks — landscape frames (3×3 slots). */
const GLOBE_REELS_H = [
  '/media/hq/h1.mp4',
  '/media/hq/h2.mp4',
  '/media/hq/h4.mp4',
  '/media/hq/h5.mp4',
] as const

/** Local HQ fallbacks — portrait frames (2×3 slots). */
const GLOBE_REELS_V = [
  '/media/hq/v1.mp4',
  '/media/hq/v2.mp4',
  '/media/hq/h3.mp4',
] as const

const CATEGORY_LABEL: Record<Category, string> = {
  promotional: 'Promotional',
  advertisements: 'Ads',
  'short-forms': 'Short-form',
}

/** Matches the sphere grid (gridCols × gridRows). */
const GLOBE_COUNT = 50

export function buildGlobeProjects(
  horizontalUrls: string[] = [...GLOBE_REELS_H],
  verticalUrls: string[] = [...GLOBE_REELS_V],
): Project[] {
  const h = horizontalUrls.length ? horizontalUrls : [...GLOBE_REELS_H]
  const v = verticalUrls.length ? verticalUrls : [...GLOBE_REELS_V]

  return Array.from({ length: GLOBE_COUNT }, (_, i) => {
    const site = SITE_PROJECTS[i % SITE_PROJECTS.length]!
    const tiles = boardTiles(i)
    const orientation = orientationForCluster(i)

    const videos: Partial<Record<number, string>> = {}
    const aspects: Partial<Record<number, number>> = {}
    for (const t of tiles) aspects[t.tileIndex] = t.aspect

    if (orientation === 'vertical') {
      videos[0] = v[Math.floor(i / 2) % v.length]!
    } else {
      videos[0] = h[Math.floor(i / 2) % h.length]!
    }

    return {
      slug: site.slug,
      name: site.title,
      category: CATEGORY_LABEL[site.category],
      tagline: site.service,
      palette: paletteFor(i),
      artSeed: (i * 2654435761) >>> 0,
      orientation,
      videos,
      aspects,
    }
  })
}

export const PROJECTS: Project[] = buildGlobeProjects()

export const TICKER_ITEMS = SITE_PROJECTS.map(
  (p) => `${p.title} — ${p.client}`,
)
