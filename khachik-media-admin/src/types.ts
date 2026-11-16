export const FILMS_SECTIONS = [
  { id: 'films_short_forms', label: 'Short-forms' },
  { id: 'films_promotional', label: 'Promotional Events' },
  { id: 'films_corporate', label: 'Corporate Events' },
  { id: 'films_advertisements', label: 'Advertisements' },
] as const

export const GLOBE_SECTIONS = [
  { id: 'globe_horizontal', label: 'Horizontal clips' },
  { id: 'globe_vertical', label: 'Vertical clips' },
] as const

export const ALL_SECTIONS = [
  ...FILMS_SECTIONS,
  { id: 'stills', label: 'Stills' },
  ...GLOBE_SECTIONS,
] as const

export type MediaSectionId = (typeof ALL_SECTIONS)[number]['id']

export function sectionLabel(id: string) {
  return ALL_SECTIONS.find((s) => s.id === id)?.label ?? id
}
