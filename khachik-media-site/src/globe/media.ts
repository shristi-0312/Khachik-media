import type { ApiMediaItem } from '../api/client'
import { globeMediaUrl, globeTileUrl } from '../media/cdn'
import { FIELD, type BoardKind } from './config'

/** One asset for one board. */
export interface FieldMedia {
  id: string
  kind: 'image' | 'video'
  /** Same-origin URL the texture is read from (CDN thumb for stills). */
  src: string
  /** Shown in the hover label. */
  label: string
  /** Where a click on the board goes. */
  page: 'stills' | 'films'
  /** Known up front for reels; stills report theirs once decoded. */
  shape?: BoardKind
}

/** Library sections whose clips are short enough to loop on the field, and their shape. */
const REEL_SECTIONS: Partial<Record<ApiMediaItem['section'], BoardKind>> = {
  globe_vertical: 'P',
  globe_horizontal: 'L',
  films_short_forms: 'P',
}

/**
 * Admin Media Library → field media.
 *
 * Stills use their ~720px CDN tile, never the original. Only short reels play
 * as video: the long-form films are tens to hundreds of MB each and belong on
 * the Films page, not looping behind a grid.
 */
export function fromLibrary(items: ApiMediaItem[]): FieldMedia[] {
  const live = items.filter((i) => i.published !== false && Boolean(i.url))

  const named = (title: string | undefined, kind: string) =>
    title?.trim() ? `${title.trim()} — ${kind}` : kind

  const stills: FieldMedia[] = live
    .filter((i) => i.mediaType === 'image')
    .map((i) => ({
      id: i.id,
      kind: 'image',
      // Prefer API globeThumbUrl (720) when present; never the multi-MB original.
      src: globeTileUrl(i.globeThumbUrl || i.url),
      label: named(i.title, 'Stills'),
      page: 'stills',
    }))

  // Clips uploaded for the globe come first, then short-forms.
  const order = Object.keys(REEL_SECTIONS)
  const reels: FieldMedia[] = live
    .filter((i) => i.mediaType === 'video' && REEL_SECTIONS[i.section])
    .sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section))
    .slice(0, FIELD.maxReels)
    .map((i) => ({
      id: i.id,
      kind: 'video',
      src: globeMediaUrl(i.url),
      label: named(i.title, i.section === 'films_short_forms' ? 'Short-form' : 'Reel'),
      page: 'films',
      shape: REEL_SECTIONS[i.section],
    }))

  return [...stills, ...reels]
}

const LOCAL_STILLS = 42

/** Bundled media — used only when the library cannot be reached or is empty. */
export function localFallback(): FieldMedia[] {
  const stills: FieldMedia[] = Array.from({ length: LOCAL_STILLS }, (_, i) => ({
    id: `local-still-${i + 1}`,
    kind: 'image',
    src: `/media/stills/still-${i + 1}.jpg`,
    label: 'Stills',
    page: 'stills',
  }))
  const reels: FieldMedia[] = ['/media/hq/v1.mp4', '/media/hq/v2.mp4'].map((src, i) => ({
    id: `local-reel-${i + 1}`,
    kind: 'video',
    src,
    label: 'Reel',
    page: 'films',
    shape: 'P',
  }))
  return [...stills, ...reels]
}

/** A bundled still standing in for one the CDN failed to deliver. */
export function localStandIn(src: string): string | null {
  if (src.startsWith('/media/stills/')) return null
  let h = 0
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0
  return `/media/stills/still-${(Math.abs(h) % LOCAL_STILLS) + 1}.jpg`
}
