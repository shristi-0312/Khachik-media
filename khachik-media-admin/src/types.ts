import type { GallerySlot } from './api'

export const CATEGORIES = [
  { id: 'promotional', label: 'Promotional Events' },
  { id: 'corporate', label: 'Corporate Events' },
  { id: 'advertisements', label: 'Advertisements' },
  { id: 'short-forms', label: 'Short-forms' },
] as const

export const GALLERY_SLOTS: { slot: GallerySlot; label: string }[] = [
  { slot: 'full', label: 'Gallery full' },
  { slot: 'pair-1', label: 'Gallery pair 1' },
  { slot: 'pair-2', label: 'Gallery pair 2' },
  { slot: 'triple-1', label: 'Gallery triple 1' },
  { slot: 'triple-2', label: 'Gallery triple 2' },
  { slot: 'triple-3', label: 'Gallery triple 3' },
]

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
