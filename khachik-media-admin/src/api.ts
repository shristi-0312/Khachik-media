const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000'

export type MediaType = 'image' | 'video'
export type MediaSectionId =
  | 'films_short_forms'
  | 'films_promotional'
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
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new Error(
      `Network error talking to ${API_URL}. Use https://65-2-150-121.sslip.io/admin and hard-refresh / re-login.`,
    )
  }

  if (res.status === 401) {
    localStorage.removeItem('km_token')
    localStorage.removeItem('km_email')
    throw new Error('Session expired — log in again.')
  }

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

export async function reorderMedia(section: MediaSectionId, orderedIds: string[]) {
  return request<MediaItem[]>('/admin/media/reorder', {
    method: 'POST',
    body: JSON.stringify({ section, orderedIds }),
  })
}

function mediaTypeFor(file: File, contentType: string): MediaType {
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('image/')) return 'image'
  return file.name.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image'
}

async function uploadViaApiProxy(section: MediaSectionId, file: File, contentType: string) {
  const q = new URLSearchParams({ section, filename: file.name })
  const res = await fetch(`${API_URL}/admin/uploads/media-file?${q}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      ...authHeaders(),
    },
    body: file,
  })

  if (res.status === 404) return null

  if (res.status === 401) {
    localStorage.removeItem('km_token')
    localStorage.removeItem('km_email')
    throw new Error('Session expired — log in again.')
  }

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: unknown }
      message = typeof body.error === 'string' ? body.error : JSON.stringify(body.error ?? body)
    } catch {
      /* ignore */
    }
    throw new Error(message || `Upload failed (${res.status})`)
  }

  return (await res.json()) as { key: string; publicUrl: string }
}

/** Upload original bytes via API→S3 (avoids browser↔S3 CORS). Falls back to presign. */
export async function uploadMediaFile(section: MediaSectionId, file: File) {
  const contentType = file.type || 'application/octet-stream'
  const mediaType = mediaTypeFor(file, contentType)

  try {
    const proxied = await uploadViaApiProxy(section, file, contentType)
    if (proxied) return { ...proxied, mediaType }
  } catch (err) {
    // If the proxy route exists and failed for a real reason, surface it.
    if (err instanceof Error && err.message !== 'Failed to fetch') throw err
  }

  const presign = await request<{
    uploadUrl: string
    publicUrl: string
    key: string
    cacheControl?: string
  }>('/admin/uploads/presign-media', {
    method: 'POST',
    body: JSON.stringify({
      section,
      contentType,
      filename: file.name,
    }),
  })

  let put: Response
  try {
    const headers: Record<string, string> = { 'Content-Type': contentType }
    if (presign.cacheControl) headers['Cache-Control'] = presign.cacheControl
    put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    })
  } catch {
    throw new Error(
      'Upload failed reaching S3. Redeploy API/admin so uploads go through the API proxy.',
    )
  }

  if (!put.ok) {
    throw new Error(`S3 upload failed (${put.status})`)
  }

  if (mediaType === 'image' || mediaType === 'video') {
    try {
      await request('/admin/uploads/ensure-thumb', {
        method: 'POST',
        body: JSON.stringify({ key: presign.key, publicUrl: presign.publicUrl }),
      })
    } catch {
      /* original still usable; globe / poster falls back until the derivative exists */
    }
  }

  return { ...presign, mediaType }
}

export { API_URL }
