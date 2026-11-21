import type { Category, GallerySlot, MediaType } from '@prisma/client'

export type PublicGalleryItem = {
  slot: string
  mediaType: MediaType
  url: string
}

export type PublicProject = {
  id: string
  slug: string
  title: string
  date: string
  year: string
  client: string
  service: string
  category: string
  description: string[]
  coverUrl: string | null
  coverType: MediaType | null
  heroUrl: string | null
  heroType: MediaType | null
  /** Derived CloudFront first-frame JPEG when cover is video. */
  posterUrl: string | null
  published: boolean
  sortOrder: number
  gallery: PublicGalleryItem[]
}

export const GALLERY_SLOTS: GallerySlot[] = [
  'full',
  'pair_1',
  'pair_2',
  'triple_1',
  'triple_2',
  'triple_3',
]

export const SLOT_API_MAP: Record<GallerySlot, string> = {
  full: 'full',
  pair_1: 'pair-1',
  pair_2: 'pair-2',
  triple_1: 'triple-1',
  triple_2: 'triple-2',
  triple_3: 'triple-3',
}

export const SLOT_DB_MAP: Record<string, GallerySlot> = {
  full: 'full',
  'pair-1': 'pair_1',
  'pair-2': 'pair_2',
  'triple-1': 'triple_1',
  'triple-2': 'triple_2',
  'triple-3': 'triple_3',
}

export const CATEGORY_API_MAP: Record<Category, string> = {
  promotional: 'promotional',
  // Retired Films tab — still in Postgres enum; expose as promotional
  corporate: 'promotional',
  advertisements: 'advertisements',
  short_forms: 'short-forms',
}

export const CATEGORY_DB_MAP: Record<string, Category> = {
  promotional: 'promotional',
  advertisements: 'advertisements',
  'short-forms': 'short_forms',
  corporate: 'promotional',
}
