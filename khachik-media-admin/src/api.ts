const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000'

export type MediaType = 'image' | 'video'
export type MediaSectionId =
  | 'films_short_forms'
  | 'films_promotional'
  | 'films_corporate'
  | 'films_advertisements'
  | 'stills'
  | 'globe_horizontal'
  | 'globe_vertical'

export type MediaItem = {
  id: string
  section: MediaSectionId
  title: string
  dateLabel: string
  mediaType: MediaType
  url: string
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type MediaInput = {
  section: MediaSectionId
  title?: string
  dateLabel?: string
  mediaType: MediaType
  url: string
  published?: boolean
  sortOrder?: number
}

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

export async function listMedia(section?: MediaSectionId) {
  const q = section ? `?section=${encodeURIComponent(section)}` : ''
  return request<MediaItem[]>(`/admin/media${q}`)
}

export async function createMedia(body: MediaInput) {
  return request<MediaItem>('/admin/media', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateMedia(id: string, body: Partial<MediaInput>) {
  return request<MediaItem>(`/admin/media/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function deleteMedia(id: string) {
  return request<void>(`/admin/media/${id}`, { method: 'DELETE' })
}

/** Browser → S3 PUT of the original file (no recompression). */
export async function uploadMediaFile(section: MediaSectionId, file: File) {
  const contentType = file.type || 'application/octet-stream'
  const presign = await request<{ uploadUrl: string; publicUrl: string; key: string }>(
    '/admin/uploads/presign-media',
    {
      method: 'POST',
      body: JSON.stringify({
        section,
        contentType,
        filename: file.name,
      }),
    },
  )

  const put = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })

  if (!put.ok) {
    throw new Error(`S3 upload failed (${put.status})`)
  }

  const mediaType: MediaType = contentType.startsWith('video/')
    ? 'video'
    : contentType.startsWith('image/')
      ? 'image'
      : file.name.match(/\.(mp4|webm|mov)$/i)
        ? 'video'
        : 'image'

  return { ...presign, mediaType }
}

export { API_URL }
