import type { MediaItem } from '@prisma/client'

export type PublicMediaItem = {
  id: string
  section: string
  title: string
  dateLabel: string
  mediaType: 'image' | 'video'
  url: string
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export function serializeMedia(item: MediaItem): PublicMediaItem {
  return {
    id: item.id,
    section: item.section,
    title: item.title,
    dateLabel: item.dateLabel,
    mediaType: item.mediaType,
    url: item.url,
    published: item.published,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
