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
  /** Photo stills by tile index (0–3 in a 2×2 board). */
  images?: Partial<Record<number, string>>
  /** Looping clips by tile index. */
  videos?: Partial<Record<number, string>>
  aspects?: Partial<Record<number, number>>
  palette?: [string, string, string]
  artSeed: number
  orientation: 'horizontal' | 'vertical'
}

export type GlobeMediaItem = {
  url: string
  mediaType: 'image' | 'video'
  title?: string
  section?: string
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`
}

const HUE_FAMILIES = [178, 6, 44, 148, 214, 18, 292, 78] as const

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

const GLOBE_REELS = [
  '/media/hq/h1.mp4',
  '/media/hq/h2.mp4',
  '/media/hq/h3.mp4',
  '/media/hq/h4.mp4',
  '/media/hq/h5.mp4',
  '/media/hq/v1.mp4',
  '/media/hq/v2.mp4',
] as const

const GLOBE_STILLS = Array.from({ length: 42 }, (_, i) => `/media/stills/still-${(i % 42) + 1}.jpg`)

const CATEGORY_LABEL: Record<Category, string> = {
  promotional: 'Promotional',
  advertisements: 'Ads',
  'short-forms': 'Short-form',
}

/** Matches denser sphere packing (gridCols × gridRows). */
const GLOBE_COUNT = 72

/** Cap unique CDN assets so the sphere paints like Griflan (many small tiles). */
const MAX_UNIQUE_STILLS = 36
const MAX_UNIQUE_VIDEOS = 4

function localFallbackItems(): GlobeMediaItem[] {
  const out: GlobeMediaItem[] = []
  for (let i = 0; i < GLOBE_STILLS.length; i++) {
    out.push({
      url: GLOBE_STILLS[i]!,
      mediaType: 'image',
      section: 'stills',
      title: `Still ${i + 1}`,
    })
  }
  // A few local reels only — never block first paint on HQ streams.
  for (let i = 0; i < Math.min(MAX_UNIQUE_VIDEOS, GLOBE_REELS.length); i++) {
    out.push({
      url: GLOBE_REELS[i]!,
      mediaType: 'video',
      section: 'globe_horizontal',
    })
  }
  return out
}

function uniqueByUrl(items: GlobeMediaItem[], limit: number): GlobeMediaItem[] {
  const seen = new Set<string>()
  const out: GlobeMediaItem[] = []
  for (const item of items) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Build sphere projects as Griflan-style 2×2 boards.
 * Stills-first with a hard cap on unique URLs so CDN HQ never stalls the section.
 */
export function buildGlobeProjects(
  library: GlobeMediaItem[] = [],
  horizontalUrls?: string[],
  verticalUrls?: string[],
): Project[] {
  let items = library.filter((m) => Boolean(m.url))

  if (!items.length && (horizontalUrls?.length || verticalUrls?.length)) {
    items = [
      ...(horizontalUrls ?? []).map((url) => ({
        url,
        mediaType: 'video' as const,
        section: 'globe_horizontal',
      })),
      ...(verticalUrls ?? []).map((url) => ({
        url,
        mediaType: 'video' as const,
        section: 'globe_vertical',
      })),
    ]
  }

  if (!items.length) items = localFallbackItems()

  const stills = uniqueByUrl(
    items.filter((m) => m.mediaType === 'image'),
    MAX_UNIQUE_STILLS,
  )
  const videosOnly = uniqueByUrl(
    items.filter((m) => m.mediaType === 'video'),
    MAX_UNIQUE_VIDEOS,
  )
  // If API returned only multi-MB originals without usable stills, keep local tiles.
  const fillPool = stills.length ? stills : localFallbackItems().filter((m) => m.mediaType === 'image')

  return Array.from({ length: GLOBE_COUNT }, (_, i) => {
    const site = SITE_PROJECTS[i % SITE_PROJECTS.length]!
    const tiles = boardTiles(i)
    const orientation = orientationForCluster(i)

    const videos: Partial<Record<number, string>> = {}
    const images: Partial<Record<number, string>> = {}
    const aspects: Partial<Record<number, number>> = {}
    for (const t of tiles) aspects[t.tileIndex] = t.aspect

    // Mostly stills; sprinkle at most one video cell per board, sparsely.
    for (let t = 0; t < 4; t++) {
      const useVideo = videosOnly.length > 0 && t === 0 && i % 6 === 0
      const media = useVideo
        ? videosOnly[Math.floor(i / 6) % videosOnly.length]!
        : fillPool[(i * 4 + t) % fillPool.length]!
      if (media.mediaType === 'image') images[t] = media.url
      else videos[t] = media.url
    }

    const first = fillPool[i % fillPool.length]!
    const label = first.title?.trim() || site.title

    return {
      slug: site.slug,
      name: label,
      category: CATEGORY_LABEL[site.category],
      tagline: site.service,
      palette: paletteFor(i),
      artSeed: (i * 2654435761) >>> 0,
      orientation,
      videos: Object.keys(videos).length ? videos : undefined,
      images: Object.keys(images).length ? images : undefined,
      aspects,
    }
  })
}

export const PROJECTS: Project[] = buildGlobeProjects()

export const TICKER_ITEMS = SITE_PROJECTS.map((p) => `${p.title} — ${p.client}`)
