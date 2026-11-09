import { DEMO_PROJECTS } from './demoData'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000'

/** Local UI preview without API/Postgres. Enable with VITE_DEMO_MODE=true in .env */
export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? '') === 'true'

export type MediaType = 'image' | 'video'
export type Category = 'promotional' | 'corporate' | 'advertisements' | 'short-forms'
export type GallerySlot = 'full' | 'pair-1' | 'pair-2' | 'triple-1' | 'triple-2' | 'triple-3'

export type GalleryItem = {
  slot: GallerySlot
  mediaType: MediaType
  url: string
}

export type Project = {
  id: string
  slug: string
  title: string
  date: string
  year: string
  client: string
  service: string
  category: Category
  description: string[]
  coverUrl: string | null
  coverType: MediaType | null
  heroUrl: string | null
  heroType: MediaType | null
  published: boolean
  sortOrder: number
  gallery: GalleryItem[]
}

export type ProjectInput = Omit<Project, 'id' | 'gallery'> & {
  gallery?: GalleryItem[]
}

let demoProjects: Project[] = DEMO_PROJECTS.map((p) => ({ ...p, gallery: [...p.gallery] }))

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('km_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: unknown }
      message = typeof body.error === 'string' ? body.error : JSON.stringify(body.error ?? body)
    } catch {
      /* ignore */
    }
    throw new Error(message || `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function login(email: string, password: string) {
  if (DEMO_MODE) {
    if (!email.trim() || !password.trim()) {
      throw new Error('Enter any email and password for local demo')
    }
    localStorage.setItem('km_token', 'demo-token')
    localStorage.setItem('km_email', email.trim())
    return { token: 'demo-token', email: email.trim() }
  }

  const data = await request<{ token: string; email: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('km_token', data.token)
  localStorage.setItem('km_email', data.email)
  return data
}

export function logout() {
  localStorage.removeItem('km_token')
  localStorage.removeItem('km_email')
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem('km_token'))
}

export async function listProjects() {
  if (DEMO_MODE) return demoProjects.map((p) => ({ ...p, gallery: [...p.gallery] }))
  return request<Project[]>('/admin/projects')
}

export async function getProject(id: string) {
  if (DEMO_MODE) {
    const project = demoProjects.find((p) => p.id === id)
    if (!project) throw new Error('Project not found')
    return { ...project, gallery: [...project.gallery] }
  }
  return request<Project>(`/admin/projects/${id}`)
}

export async function createProject(body: ProjectInput) {
  if (DEMO_MODE) {
    const created: Project = {
      id: `demo-${Date.now()}`,
      gallery: body.gallery ?? [],
      ...body,
    }
    demoProjects = [...demoProjects, created]
    return created
  }
  return request<Project>('/admin/projects', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateProject(id: string, body: Partial<ProjectInput>) {
  if (DEMO_MODE) {
    const index = demoProjects.findIndex((p) => p.id === id)
    if (index < 0) throw new Error('Project not found')
    const current = demoProjects[index]
    const updated: Project = {
      ...current,
      ...body,
      gallery: body.gallery ?? current.gallery,
    }
    demoProjects = demoProjects.map((p, i) => (i === index ? updated : p))
    return updated
  }
  return request<Project>(`/admin/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function deleteProject(id: string) {
  if (DEMO_MODE) {
    demoProjects = demoProjects.filter((p) => p.id !== id)
    return
  }
  return request<void>(`/admin/projects/${id}`, { method: 'DELETE' })
}

export async function uploadFile(slug: string, file: File) {
  if (DEMO_MODE) {
    const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'image'
    const publicUrl = URL.createObjectURL(file)
    return {
      uploadUrl: '',
      publicUrl,
      key: `demo/${slug}/${file.name}`,
      mediaType,
    }
  }

  const presign = await request<{ uploadUrl: string; publicUrl: string; key: string }>(
    '/admin/uploads/presign',
    {
      method: 'POST',
      body: JSON.stringify({
        slug,
        contentType: file.type || 'application/octet-stream',
        filename: file.name,
      }),
    },
  )

  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })

  if (!put.ok) {
    throw new Error(`S3 upload failed (${put.status})`)
  }

  const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'image'
  return { ...presign, mediaType }
}

export { API_URL }
