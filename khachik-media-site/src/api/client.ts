import type { Category, GallerySlot, Project } from '../data/content'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export type ApiGalleryItem = {
  slot: string
  mediaType: 'image' | 'video'
  url: string
}

export type ApiProject = {
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
  coverType: 'image' | 'video' | null
  heroUrl: string | null
  heroType: 'image' | 'video' | null
  published: boolean
  sortOrder: number
  gallery: ApiGalleryItem[]
}

export function apiConfigured() {
  return Boolean(API_URL)
}

export function mapApiProject(p: ApiProject): Project {
  return {
    slug: p.slug,
    title: p.title,
    date: p.date,
    year: p.year,
    client: p.client,
    service: p.service,
    category: p.category as Category,
    description: p.description,
    coverUrl: p.coverUrl,
    coverType: p.coverType,
    heroUrl: p.heroUrl,
    heroType: p.heroType,
    gallery: p.gallery.map((g) => ({
      slot: g.slot as GallerySlot,
      mediaType: g.mediaType,
      url: g.url,
    })),
  }
}

export async function fetchProjects(): Promise<Project[]> {
  if (!API_URL) return []
  const res = await fetch(`${API_URL}/projects`)
  if (!res.ok) throw new Error(`Failed to load projects (${res.status})`)
  const data = (await res.json()) as ApiProject[]
  return data.map(mapApiProject)
}

export async function fetchProject(slug: string): Promise<Project | null> {
  if (!API_URL) return null
  const res = await fetch(`${API_URL}/projects/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load project (${res.status})`)
  return mapApiProject((await res.json()) as ApiProject)
}

export { API_URL }
