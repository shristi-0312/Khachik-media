import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createMedia,
  deleteMedia,
  isLoggedIn,
  listMedia,
  updateMedia,
  uploadMediaFile,
  type MediaItem,
  type MediaSectionId,
} from '../api'

type Tab = { id: MediaSectionId; label: string }

type Props = {
  title: string
  subtitle: string
  tabs: readonly Tab[]
  /** video | image | any */
  accept: 'video' | 'image' | 'any'
  showMeta?: boolean
}

function acceptAttr(accept: Props['accept']) {
  if (accept === 'video') return 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'
  if (accept === 'image') return 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
  return 'video/*,image/*'
}

export function MediaLibraryPage({ title, subtitle, tabs, accept, showMeta = false }: Props) {
  const loggedIn = isLoggedIn()
  const [section, setSection] = useState<MediaSectionId>(tabs[0]!.id)
  const [items, setItems] = useState<MediaItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listMedia(section)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media')
    } finally {
      setLoading(false)
    }
  }, [section])

  useEffect(() => {
    if (!loggedIn) return
    void load()
  }, [loggedIn, load])

  const hint = useMemo(() => {
    if (accept === 'video') return 'Upload original MP4 / MOV / WebM — served at full quality via CloudFront.'
    if (accept === 'image') return 'Upload original JPG / PNG / WebP — no compression on our side.'
    return 'Original files only — browser uploads straight to S3.'
  }, [accept])

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    for (const file of files) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name)
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name)
      if (accept === 'video' && !isVideo) {
        setError(`Skipped ${file.name} — videos only in this section.`)
        continue
      }
      if (accept === 'image' && !isImage) {
        setError(`Skipped ${file.name} — images only in this section.`)
        continue
      }

      setBusy(file.name)
      setError('')
      try {
        const uploaded = await uploadMediaFile(section, file)
        const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
        await createMedia({
          section,
          title: showMeta ? draftTitle.trim() || baseName : '',
          dateLabel: showMeta ? draftDate.trim() : '',
          mediaType: uploaded.mediaType,
          url: uploaded.publicUrl,
          published: true,
        })
        setDraftTitle('')
        setDraftDate('')
        await load()
      } catch (err) {
        setError(err instanceof Error ? err.message : `Upload failed for ${file.name}`)
      } finally {
        setBusy('')
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  async function togglePublished(item: MediaItem) {
    try {
      await updateMedia(item.id, { published: !item.published })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function saveMeta(item: MediaItem, title: string, dateLabel: string) {
    try {
      await updateMedia(item.id, { title, dateLabel })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function remove(item: MediaItem) {
    if (!confirm(`Remove “${item.title || 'this asset'}” from the library?`)) return
    try {
      await deleteMedia(item.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (!loggedIn) return <Navigate to="/login" replace />

  return (
    <div className="stack loose">
      <div className="section-head">
        <div>
          <p className="eyebrow">{title}</p>
          <h2 style={{ margin: 0 }}>{subtitle}</h2>
          <p className="hint">{hint}</p>
        </div>
      </div>

      {tabs.length > 1 ? (
        <div className="filter-row" role="tablist" aria-label="Sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-chip${section === tab.id ? ' active' : ''}`}
              onClick={() => setSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <section className="panel upload-panel">
        {showMeta ? (
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label className="field">
              <span>Title (optional before upload)</span>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="e.g. Swiggy Nights"
              />
            </label>
            <label className="field">
              <span>Date label</span>
              <input
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                placeholder="e.g. Mar, 2024"
              />
            </label>
          </div>
        ) : null}

        <label className={`dropzone${busy ? ' busy' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr(accept)}
            multiple
            hidden
            disabled={Boolean(busy)}
            onChange={(e) => void onFiles(e.target.files)}
          />
          <strong>{busy ? `Uploading ${busy}…` : 'Drop files or click to upload'}</strong>
          <span>Original quality preserved · direct to S3 · served on CloudFront</span>
        </label>
      </section>

      {loading ? <p className="loading-block">Loading…</p> : null}

      {!loading ? (
        <div className="media-grid">
          {items.length === 0 ? (
            <p className="empty-state">No media in this section yet.</p>
          ) : (
            items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                showMeta={showMeta}
                onToggle={() => void togglePublished(item)}
                onSaveMeta={(title, dateLabel) => void saveMeta(item, title, dateLabel)}
                onDelete={() => void remove(item)}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function MediaCard({
  item,
  showMeta,
  onToggle,
  onSaveMeta,
  onDelete,
}: {
  item: MediaItem
  showMeta: boolean
  onToggle: () => void
  onSaveMeta: (title: string, dateLabel: string) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [dateLabel, setDateLabel] = useState(item.dateLabel)

  useEffect(() => {
    setTitle(item.title)
    setDateLabel(item.dateLabel)
  }, [item.id, item.title, item.dateLabel])

  return (
    <article className={`media-card${item.published ? '' : ' dimmed'}`}>
      <div className="media-card-preview">
        {item.mediaType === 'video' ? (
          <video src={item.url} muted playsInline preload="metadata" controls />
        ) : (
          <img src={item.url} alt={item.title || 'Still'} loading="lazy" />
        )}
      </div>
      <div className="media-card-body">
        {showMeta ? (
          <div className="stack tight">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== item.title || dateLabel !== item.dateLabel) onSaveMeta(title, dateLabel)
              }}
              placeholder="Title"
            />
            <input
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              onBlur={() => {
                if (title !== item.title || dateLabel !== item.dateLabel) onSaveMeta(title, dateLabel)
              }}
              placeholder="Date label"
            />
          </div>
        ) : (
          <p className="media-card-name">{item.title || item.url.split('/').pop()}</p>
        )}
        <div className="media-card-actions">
          <button type="button" className="button secondary sm" onClick={onToggle}>
            {item.published ? 'Hide' : 'Publish'}
          </button>
          <a className="button secondary sm" href={item.url} target="_blank" rel="noreferrer">
            Open HQ
          </a>
          <button type="button" className="button danger sm" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
