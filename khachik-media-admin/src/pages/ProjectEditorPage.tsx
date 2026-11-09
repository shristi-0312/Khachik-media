import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  createProject,
  getProject,
  isLoggedIn,
  updateProject,
  uploadFile,
  type Category,
  type GalleryItem,
  type GallerySlot,
  type MediaType,
  type Project,
} from '../api'
import { CATEGORIES, GALLERY_SLOTS, slugify } from '../types'

type FormState = {
  slug: string
  title: string
  date: string
  year: string
  client: string
  service: string
  category: Category
  descriptionText: string
  coverUrl: string
  coverType: MediaType | ''
  heroUrl: string
  heroType: MediaType | ''
  published: boolean
  sortOrder: number
  gallery: Record<GallerySlot, GalleryItem | null>
}

const emptyGallery = (): FormState['gallery'] => ({
  full: null,
  'pair-1': null,
  'pair-2': null,
  'triple-1': null,
  'triple-2': null,
  'triple-3': null,
})

function fromProject(project: Project): FormState {
  const gallery = emptyGallery()
  for (const item of project.gallery) {
    gallery[item.slot] = item
  }
  return {
    slug: project.slug,
    title: project.title,
    date: project.date,
    year: project.year,
    client: project.client,
    service: project.service,
    category: project.category,
    descriptionText: project.description.join('\n\n'),
    coverUrl: project.coverUrl ?? '',
    coverType: project.coverType ?? '',
    heroUrl: project.heroUrl ?? '',
    heroType: project.heroType ?? '',
    published: project.published,
    sortOrder: project.sortOrder,
    gallery,
  }
}

const blankForm = (): FormState => ({
  slug: '',
  title: '',
  date: '',
  year: new Date().getFullYear().toString(),
  client: '',
  service: '',
  category: 'promotional',
  descriptionText: '',
  coverUrl: '',
  coverType: '',
  heroUrl: '',
  heroType: '',
  published: false,
  sortOrder: 0,
  gallery: emptyGallery(),
})

export function ProjectEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const loggedIn = isLoggedIn()
  const [form, setForm] = useState<FormState>(blankForm())
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')

  useEffect(() => {
    if (!loggedIn || isNew) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const project = await getProject(id!)
        if (!cancelled) setForm(fromProject(project))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew, loggedIn])

  if (!loggedIn) return <Navigate to="/login" replace />

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleUpload(kind: 'cover' | 'hero' | GallerySlot, file: File | null) {
    if (!file) return
    const slug = form.slug || slugify(form.title) || 'untitled'
    setUploading(kind)
    setError('')
    try {
      const result = await uploadFile(slug, file)
      if (kind === 'cover') {
        setForm((prev) => ({ ...prev, coverUrl: result.publicUrl, coverType: result.mediaType }))
      } else if (kind === 'hero') {
        setForm((prev) => ({ ...prev, heroUrl: result.publicUrl, heroType: result.mediaType }))
      } else {
        setForm((prev) => ({
          ...prev,
          gallery: {
            ...prev.gallery,
            [kind]: { slot: kind, mediaType: result.mediaType, url: result.publicUrl },
          },
        }))
      }
      setStatus(`Uploaded ${file.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading('')
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const gallery = Object.values(form.gallery).filter(Boolean) as GalleryItem[]
      const payload = {
        slug: form.slug || slugify(form.title),
        title: form.title,
        date: form.date,
        year: form.year,
        client: form.client,
        service: form.service,
        category: form.category,
        description: form.descriptionText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean),
        coverUrl: form.coverUrl || null,
        coverType: (form.coverType || null) as MediaType | null,
        heroUrl: form.heroUrl || null,
        heroType: (form.heroType || null) as MediaType | null,
        published: form.published,
        sortOrder: form.sortOrder,
        gallery,
      }

      if (isNew) {
        const created = await createProject(payload)
        setStatus('Created')
        navigate(`/projects/${created.id}`, { replace: true })
      } else {
        await updateProject(id!, payload)
        setStatus('Saved')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="page">Loading…</main>

  return (
    <main className="page">
      <header className="row between">
        <div>
          <p>
            <Link to="/">← Projects</Link>
          </p>
          <h1>{isNew ? 'New project' : 'Edit project'}</h1>
        </div>
      </header>

      <form className="stack" onSubmit={onSubmit}>
        <div className="grid2">
          <label>
            Project name
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                setForm((prev) => ({
                  ...prev,
                  title,
                  slug: isNew && !prev.slug ? slugify(title) : prev.slug,
                }))
              }}
              required
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(e) => setField('slug', slugify(e.target.value))}
              required
            />
          </label>
          <label>
            Date label
            <input
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
              placeholder="Oct, 2024"
              required
            />
          </label>
          <label>
            Year
            <input value={form.year} onChange={(e) => setField('year', e.target.value)} required />
          </label>
          <label>
            Client
            <input
              value={form.client}
              onChange={(e) => setField('client', e.target.value)}
              required
            />
          </label>
          <label>
            Service
            <input
              value={form.service}
              onChange={(e) => setField('service', e.target.value)}
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField('sortOrder', Number(e.target.value))}
            />
          </label>
        </div>

        <label>
          Description (paragraphs separated by a blank line)
          <textarea
            rows={8}
            value={form.descriptionText}
            onChange={(e) => setField('descriptionText', e.target.value)}
          />
        </label>

        <label className="row">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setField('published', e.target.checked)}
          />
          Published
        </label>

        <section className="panel">
          <h2>Cover (projects grid)</h2>
          <MediaSlot
            url={form.coverUrl}
            mediaType={form.coverType || null}
            uploading={uploading === 'cover'}
            onUpload={(file) => void handleUpload('cover', file)}
            onClear={() => setForm((prev) => ({ ...prev, coverUrl: '', coverType: '' }))}
          />
        </section>

        <section className="panel">
          <h2>Hero</h2>
          <MediaSlot
            url={form.heroUrl}
            mediaType={form.heroType || null}
            uploading={uploading === 'hero'}
            onUpload={(file) => void handleUpload('hero', file)}
            onClear={() => setForm((prev) => ({ ...prev, heroUrl: '', heroType: '' }))}
          />
        </section>

        <section className="panel">
          <h2>Gallery slots</h2>
          <div className="grid2">
            {GALLERY_SLOTS.map(({ slot, label }) => (
              <div key={slot}>
                <h3>{label}</h3>
                <MediaSlot
                  url={form.gallery[slot]?.url ?? ''}
                  mediaType={form.gallery[slot]?.mediaType ?? null}
                  uploading={uploading === slot}
                  onUpload={(file) => void handleUpload(slot, file)}
                  onClear={() =>
                    setForm((prev) => ({
                      ...prev,
                      gallery: { ...prev.gallery, [slot]: null },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}
        {status ? <p className="ok">{status}</p> : null}

        <button type="submit" disabled={saving || Boolean(uploading)}>
          {saving ? 'Saving…' : 'Save project'}
        </button>
      </form>
    </main>
  )
}

function MediaSlot({
  url,
  mediaType,
  uploading,
  onUpload,
  onClear,
}: {
  url: string
  mediaType: MediaType | null
  uploading: boolean
  onUpload: (file: File | null) => void
  onClear: () => void
}) {
  return (
    <div className="stack tight">
      <input
        type="file"
        accept="image/*,video/*"
        disabled={uploading}
        onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
      />
      {uploading ? <p className="muted">Uploading…</p> : null}
      {url ? (
        <>
          <p className="muted break">{url}</p>
          {mediaType === 'video' ? (
            <video src={url} controls style={{ maxWidth: '100%', maxHeight: 180 }} />
          ) : (
            <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'cover' }} />
          )}
          <button type="button" className="secondary" onClick={onClear}>
            Clear
          </button>
        </>
      ) : (
        <p className="muted">No media</p>
      )}
    </div>
  )
}
