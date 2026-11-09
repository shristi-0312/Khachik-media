import type { GalleryItem, Project } from '@prisma/client'
import { CATEGORY_API_MAP, SLOT_API_MAP, type PublicProject } from './types.js'

type ProjectWithGallery = Project & { gallery: GalleryItem[] }

export function serializeProject(project: ProjectWithGallery): PublicProject {
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
