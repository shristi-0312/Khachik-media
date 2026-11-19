import type { MediaItem } from '@prisma/client'
import { deriveImageThumbs, derivePosterUrl } from './mediaUrls.js'

export type PublicMediaSrcSet = {
  avif: string
  webp: string
  jpg: string
}

export type PublicMediaItem = {
  id: string
  section: string
  title: string
  dateLabel: string
  mediaType: 'image' | 'video'
  /** Original master on CloudFront — play / lightbox only. */
  url: string
  /** Primary display still (HQ 1600 JPEG). Null for videos. */
  thumbUrl: string | null
  /** Video first-frame poster. Null for images. */
  posterUrl: string | null
  /** Globe / WebGL 720 JPEG. */
  globeThumbUrl: string | null
  /** Responsive <picture> srcsets. */
  srcset: PublicMediaSrcSet | null
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export function serializeMedia(item: MediaItem): PublicMediaItem {
  const isImage = item.mediaType === 'image'
  const isVideo = item.mediaType === 'video'
  const thumbs = isImage ? deriveImageThumbs(item.url) : null
  const posterUrl = isVideo ? derivePosterUrl(item.url) : null

  return {
    id: item.id,
    section: item.section,
    title: item.title,
    dateLabel: item.dateLabel,
    mediaType: item.mediaType,
    url: item.url,
    thumbUrl: thumbs?.thumbUrl ?? null,
    posterUrl,
    globeThumbUrl: thumbs?.globeThumbUrl ?? null,
    srcset: thumbs?.srcset ?? null,
    published: item.published,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
