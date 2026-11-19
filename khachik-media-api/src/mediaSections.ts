export const MEDIA_SECTIONS = [
  'films_short_forms',
  'films_promotional',
  'films_advertisements',
  'stills',
  'globe_horizontal',
  'globe_vertical',
] as const

export type MediaSectionId = (typeof MEDIA_SECTIONS)[number]

export const MEDIA_SECTION_META: Record<
  MediaSectionId,
  { label: string; group: 'films' | 'stills' | 'globe'; accept: 'video' | 'image' | 'any' }
> = {
  films_short_forms: { label: 'Socials', group: 'films', accept: 'video' },
  films_promotional: { label: 'Promo Events', group: 'films', accept: 'video' },
  films_advertisements: { label: 'Advertisements (retired)', group: 'films', accept: 'video' },
  stills: { label: 'Stills', group: 'stills', accept: 'image' },
  globe_horizontal: { label: 'Globe · Horizontal', group: 'globe', accept: 'video' },
  globe_vertical: { label: 'Globe · Vertical', group: 'globe', accept: 'video' },
}

export function isMediaSection(value: string): value is MediaSectionId {
  return (MEDIA_SECTIONS as readonly string[]).includes(value)
}
