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

export type GlobeMediaItem = {
  url: string
  mediaType: 'image' | 'video'
  title?: string
  section?: string
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

/** Local still fallbacks mixed onto the sphere with reels. */
const GLOBE_STILLS = Array.from({ length: 24 }, (_, i) => `/media/stills/still-${i + 1}.jpg`)

const CATEGORY_LABEL: Record<Category, string> = {
  promotional: 'Promotional',
  advertisements: 'Ads',
  'short-forms': 'Short-form',
}

/** Matches the sphere grid (gridCols × gridRows). */
const GLOBE_COUNT = 50

function preferVertical(item: GlobeMediaItem) {
  if (item.section === 'films_short_forms' || item.section === 'globe_vertical') return true
  if (item.section === 'films_promotional' || item.section === 'films_advertisements') return false
  if (item.section === 'globe_horizontal') return false
  // Stills + unknowns: alternate by hashing the URL.
  let h = 0
  for (let i = 0; i < item.url.length; i++) h = (h * 31 + item.url.charCodeAt(i)) | 0
  return (h & 1) === 1
}

function splitByOrientation(items: GlobeMediaItem[]) {
  const horizontal: GlobeMediaItem[] = []
  const vertical: GlobeMediaItem[] = []
  for (const item of items) {
    if (preferVertical(item)) vertical.push(item)
    else horizontal.push(item)
  }
  return { horizontal, vertical }
}

function localFallbackItems(): GlobeMediaItem[] {
  const videosH = GLOBE_REELS_H.map((url) => ({
    url,
    mediaType: 'video' as const,
    section: 'globe_horizontal',
  }))
  const videosV = GLOBE_REELS_V.map((url) => ({
    url,
    mediaType: 'video' as const,
    section: 'globe_vertical',
  }))
  const stills = GLOBE_STILLS.map((url, i) => ({
    url,
    mediaType: 'image' as const,
    section: 'stills',
    title: `Still ${i + 1}`,
  }))
  // Interleave so the sphere reads as a mixed reel + still collage.
  const out: GlobeMediaItem[] = []
  const max = Math.max(videosH.length + videosV.length, stills.length)
  let vi = 0
  const vids = [...videosH, ...videosV]
  for (let i = 0; i < max; i++) {
    if (i % 3 !== 2 && vi < vids.length) out.push(vids[vi++]!)
    if (stills[i]) out.push(stills[i]!)
  }
  while (vi < vids.length) out.push(vids[vi++]!)
  return out
}

/**
 * Build sphere projects from a mixed library (films + stills + globe clips).
 * Falls back to local HQ reels + stills when the library is empty.
 */
export function buildGlobeProjects(
  library: GlobeMediaItem[] = [],
  horizontalUrls?: string[],
  verticalUrls?: string[],
): Project[] {
  let items = library.filter((m) => Boolean(m.url))

  // Legacy path: separate H/V URL lists from older callers.
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

  const { horizontal, vertical } = splitByOrientation(items)
  const hPool = horizontal.length ? horizontal : items
  const vPool = vertical.length ? vertical : items

  return Array.from({ length: GLOBE_COUNT }, (_, i) => {
    const site = SITE_PROJECTS[i % SITE_PROJECTS.length]!
    const tiles = boardTiles(i)
    const orientation = orientationForCluster(i)
    const pool = orientation === 'vertical' ? vPool : hPool
    const media = pool[Math.floor(i / 2) % pool.length]!

    const videos: Partial<Record<number, string>> = {}
    const images: Partial<Record<number, string>> = {}
    const aspects: Partial<Record<number, number>> = {}
    for (const t of tiles) aspects[t.tileIndex] = t.aspect

    if (media.mediaType === 'image') images[0] = media.url
    else videos[0] = media.url

    const label =
      media.title?.trim() ||
      (media.section === 'stills' ? 'Still' : site.title)

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

export const TICKER_ITEMS = SITE_PROJECTS.map(
  (p) => `${p.title} — ${p.client}`,
)
