import type { GalleryItem, Project } from '@prisma/client'
import { derivePosterUrl } from './mediaUrls.js'
import { CATEGORY_API_MAP, SLOT_API_MAP, type PublicProject } from './types.js'

type ProjectWithGallery = Project & { gallery: GalleryItem[] }

export function serializeProject(project: ProjectWithGallery): PublicProject {
  const coverIsVideo =
    project.coverType === 'video' ||
    Boolean(project.coverUrl && /\.(mp4|mov|webm)(\?|$)/i.test(project.coverUrl))
  const posterUrl =
    coverIsVideo && project.coverUrl ? derivePosterUrl(project.coverUrl) : null

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    date: project.date,
    year: project.year,
    client: project.client,
    service: project.service,
    category: CATEGORY_API_MAP[project.category],
    description: project.description,
    coverUrl: project.coverUrl,
    coverType: project.coverType,
    heroUrl: project.heroUrl,
    heroType: project.heroType,
    posterUrl,
    published: project.published,
    sortOrder: project.sortOrder,
    gallery: project.gallery
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        slot: SLOT_API_MAP[item.slot],
        mediaType: item.mediaType,
        url: item.url,
      })),
  }
}
