import type { Category, GallerySlot, Project } from '../data/content'

/** Production API fallback so Vercel builds still work if the env var is missing. */
const DEFAULT_API_URL = 'https://3-108-244-235.sslip.io/api'

/** Normalize VITE_API_URL — strip accidental `VITE_API_URL=` pastes and non-absolute values. */
function resolveApiUrl(): string {
  let raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || ''
  raw = raw.replace(/^VITE_API_URL=/i, '').trim().replace(/\/$/, '')
  if (raw && !/^https?:\/\//i.test(raw)) raw = ''
  if (!raw && import.meta.env.PROD) raw = DEFAULT_API_URL
  return raw
}

const API_URL = resolveApiUrl()

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
  posterUrl?: string | null
  published: boolean
  sortOrder: number
  gallery: ApiGalleryItem[]
}

export function apiConfigured() {
  return Boolean(API_URL)
}

function normalizeCategory(value: string): Category {
  if (value === 'promotional' || value === 'advertisements' || value === 'short-forms') {
    return value
  }
  // Legacy "corporate" (and anything else) maps to promotional
  return 'promotional'
}

export function mapApiProject(p: ApiProject): Project {
  return {
    slug: p.slug,
    title: p.title,
    date: p.date,
    year: p.year,
    client: p.client,
    service: p.service,
    category: normalizeCategory(p.category),
    description: p.description,
    coverUrl: p.coverUrl,
    coverType: p.coverType,
    heroUrl: p.heroUrl,
    heroType: p.heroType,
    posterUrl: p.posterUrl ?? null,
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

export type MediaSectionId =
  | 'films_short_forms'
  | 'films_promotional'
  | 'films_advertisements'
  | 'stills'
  | 'globe_horizontal'
  | 'globe_vertical'
  | 'about'

export type ApiMediaSrcSet = {
  avif: string
  webp: string
  jpg: string
}

export type ApiMediaItem = {
  id: string
  section: MediaSectionId
  title: string
  dateLabel: string
  mediaType: 'image' | 'video'
  /** Original master — play / lightbox only. */
  url: string
  /** HQ display still (1600 JPEG). */
  thumbUrl?: string | null
  /** Video first-frame poster. */
  posterUrl?: string | null
  /** Globe / WebGL 720 JPEG. */
  globeThumbUrl?: string | null
  srcset?: ApiMediaSrcSet | null
  published: boolean
  sortOrder: number
}

const FILMS_SECTION_TO_CATEGORY: Record<string, Category> = {
  films_short_forms: 'short-forms',
  films_promotional: 'promotional',
  films_advertisements: 'advertisements',
}

/** Map library media into the Project shape used by Films cards / overlay. */
export function mediaToProject(item: ApiMediaItem): Project {
  const category = FILMS_SECTION_TO_CATEGORY[item.section] ?? 'promotional'
  return {
    slug: item.id,
    title: item.title || 'Untitled',
    date: item.dateLabel || '',
    year: '',
    client: '',
    service: '',
    category,
    description: [],
    coverUrl: item.url,
    coverType: item.mediaType,
    posterUrl: item.posterUrl ?? null,
    heroUrl: item.url,
    heroType: item.mediaType,
  }
}

export async function fetchMedia(section?: MediaSectionId): Promise<ApiMediaItem[]> {
  if (!API_URL) return []
  const q = section ? `?section=${encodeURIComponent(section)}` : ''
  const res = await fetch(`${API_URL}/media${q}`)
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`)
  return (await res.json()) as ApiMediaItem[]
}

export type ContactPayload = {
  name: string
  phone: string
  message?: string
  source?: string
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  if (!API_URL) throw new Error('API is not configured')
  const res = await fetch(`${API_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let detail = `Failed to send (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
}

export { API_URL }
