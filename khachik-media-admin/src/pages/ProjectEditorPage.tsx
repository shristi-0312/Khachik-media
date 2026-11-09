import { useEffect, useId, useState, type DragEvent, type FormEvent } from 'react'
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

  if (loading) return <p className="loading-block">Loading project…</p>

  const filledGallery = GALLERY_SLOTS.filter(({ slot }) => form.gallery[slot]).length

  return (
    <form className="stack loose" onSubmit={onSubmit}>
      <div className="editor-toolbar">
        <Link className="button ghost sm" to="/projects">
          ← Back
        </Link>
        <div className="row wrap">
          {status ? <p className="ok">{status}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="button primary" disabled={saving || Boolean(uploading)}>
            {saving ? 'Saving…' : 'Save project'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="stack loose">
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Project details</h2>
                <p>Core info shown on the site</p>
              </div>
            </div>
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
                <input
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  required
                />
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
            </div>

            <label style={{ marginTop: 16 }}>
              Description
              <textarea
                rows={7}
                value={form.descriptionText}
                onChange={(e) => setField('descriptionText', e.target.value)}
                placeholder="Separate paragraphs with a blank line"
              />
            </label>
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Key media</h2>
                <p>Cover for the grid, hero for the detail page</p>
              </div>
            </div>
            <div className="media-pair">
              <MediaSlot
                label="Cover"
                hint="Projects grid thumbnail"
                url={form.coverUrl}
                mediaType={form.coverType || null}
                uploading={uploading === 'cover'}
                tall
                onUpload={(file) => void handleUpload('cover', file)}
                onClear={() => setForm((prev) => ({ ...prev, coverUrl: '', coverType: '' }))}
              />
              <MediaSlot
                label="Hero"
                hint="Top of project page"
                url={form.heroUrl}
                mediaType={form.heroType || null}
                uploading={uploading === 'hero'}
                tall
                onUpload={(file) => void handleUpload('hero', file)}
                onClear={() => setForm((prev) => ({ ...prev, heroUrl: '', heroType: '' }))}
              />
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Gallery</h2>
                <p>
                  {filledGallery} of {GALLERY_SLOTS.length} slots filled
                </p>
              </div>
            </div>

            <div className="gallery-layout">
              <MediaSlot
                label="Full width"
                hint="Large single frame"
                url={form.gallery.full?.url ?? ''}
                mediaType={form.gallery.full?.mediaType ?? null}
                uploading={uploading === 'full'}
                wide
                onUpload={(file) => void handleUpload('full', file)}
                onClear={() =>
                  setForm((prev) => ({ ...prev, gallery: { ...prev.gallery, full: null } }))
                }
              />

              <div className="gallery-pair">
                {GALLERY_SLOTS.filter((s) => s.slot.startsWith('pair-')).map(({ slot, label }) => (
                  <MediaSlot
                    key={slot}
                    label={label.replace('Gallery ', '')}
                    hint="Side-by-side pair"
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
                ))}
              </div>

              <div className="gallery-triple">
                {GALLERY_SLOTS.filter((s) => s.slot.startsWith('triple-')).map(({ slot, label }) => (
                  <MediaSlot
                    key={slot}
                    label={label.replace('Gallery ', '')}
                    hint="Triple row"
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
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="editor-aside stack">
          <section className="panel">
            <h2>Publish</h2>
            <label className="toggle-row">
              <span>
                <strong>Published on site</strong>
                <small>
                  {form.published
                    ? 'Visible on the public site'
                    : 'Draft — hidden from the public site'}
                </small>
              </span>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setField('published', e.target.checked)}
              />
            </label>
            <div style={{ marginTop: 14 }}>
              <span className={`badge ${form.published ? 'live' : 'draft'}`}>
                {form.published ? 'Live' : 'Draft'}
              </span>
            </div>
          </section>

          <section className="panel">
            <h2>Listing</h2>
            <div className="stack">
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
          </section>
        </aside>
      </div>
    </form>
  )
}

function MediaSlot({
  label,
  hint,
  url,
  mediaType,
  uploading,
  onUpload,
  onClear,
  tall,
  wide,
}: {
  label: string
  hint?: string
  url: string
  mediaType: MediaType | null
  uploading: boolean
  onUpload: (file: File | null) => void
  onClear: () => void
  tall?: boolean
  wide?: boolean
}) {
  const inputId = useId()
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0] ?? null
    onUpload(file)
  }

  return (
    <div className={`upload-card${wide ? ' wide' : ''}${tall ? ' tall' : ''}`}>
      <div className="upload-card-head">
        <div>
          <h3>{label}</h3>
          {hint ? <p>{hint}</p> : null}
        </div>
        {url ? (
          <button type="button" className="button ghost sm" onClick={onClear}>
            Remove
          </button>
        ) : null}
      </div>

      <label
        htmlFor={inputId}
        className={`dropzone${dragging ? ' dragging' : ''}${url ? ' has-media' : ''}${
          uploading ? ' busy' : ''
        }`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={onDrop}
      >
        <input
          id={inputId}
          className="dropzone-input"
          type="file"
          accept="image/*,video/*"
          disabled={uploading}
          onChange={(e) => {
            onUpload(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />

        {url ? (
          <div className="dropzone-preview">
            {mediaType === 'video' ? <video src={url} controls /> : <img src={url} alt="" />}
            <div className="dropzone-overlay">
              <span className="button secondary sm">{uploading ? 'Uploading…' : 'Replace file'}</span>
            </div>
          </div>
        ) : (
          <div className="dropzone-empty">
            <span className="dropzone-icon" aria-hidden="true">
              ↑
            </span>
            <strong>{uploading ? 'Uploading…' : 'Drop file or click to upload'}</strong>
            <span>Images or video</span>
          </div>
        )}
      </label>
    </div>
  )
}
