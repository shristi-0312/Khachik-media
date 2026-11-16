import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createMedia,
  deleteMedia,
  isLoggedIn,
  listMedia,
  reorderMedia,
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

function moveItem(list: MediaItem[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return list
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return list
  const next = [...list]
  const [item] = next.splice(fromIndex, 1)
  if (!item) return list
  next.splice(toIndex, 0, item)
  return next
}

export function MediaLibraryPage({ title, subtitle, tabs, accept, showMeta = false }: Props) {
  const loggedIn = isLoggedIn()
  const [section, setSection] = useState<MediaSectionId>(tabs[0]!.id)
  const [items, setItems] = useState<MediaItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [reordering, setReordering] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
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

  async function persistOrder(next: MediaItem[]) {
    const previous = items
    setItems(next)
    setReordering(true)
    setError('')
    try {
      const saved = await reorderMedia(
        section,
        next.map((item) => item.id),
      )
      setItems(saved)
    } catch (err) {
      setItems(previous)
      setError(err instanceof Error ? err.message : 'Failed to save order')
    } finally {
      setReordering(false)
    }
  }

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

  function moveTo(index: number, toIndex: number) {
    if (reordering || index === toIndex) return
    void persistOrder(moveItem(items, index, toIndex))
  }

  if (!loggedIn) return <Navigate to="/login" replace />

  return (
    <div className="stack loose">
      <div className="section-head">
        <div>
          <p className="eyebrow">{title}</p>
          <h2 style={{ margin: 0 }}>{subtitle}</h2>
          <p className="hint">
            {hint} Drag cards or use the position controls to set 1st, 2nd, 3rd… on the public site.
          </p>
        </div>
        {reordering ? <p className="hint" style={{ margin: 0 }}>Saving order…</p> : null}
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
              <span>Date label (optional)</span>
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
            items.map((item, index) => (
              <MediaCard
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                showMeta={showMeta}
                disabled={reordering || Boolean(busy)}
                dragging={dragIndex === index}
                dropTarget={dropIndex === index && dragIndex !== index}
                onToggle={() => void togglePublished(item)}
                onSaveMeta={(nextTitle, nextDate) => void saveMeta(item, nextTitle, nextDate)}
                onDelete={() => void remove(item)}
                onMoveUp={() => moveTo(index, index - 1)}
                onMoveDown={() => moveTo(index, index + 1)}
                onMoveTo={(position) => moveTo(index, position - 1)}
                onDragStart={() => {
                  setDragIndex(index)
                  setDropIndex(index)
                }}
                onDragEnter={() => {
                  if (dragIndex !== null) setDropIndex(index)
                }}
                onDragEnd={() => {
                  const from = dragIndex
                  const to = dropIndex
                  setDragIndex(null)
                  setDropIndex(null)
                  if (from !== null && to !== null && from !== to) {
                    void persistOrder(moveItem(items, from, to))
                  }
                }}
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
  index,
  total,
  showMeta,
  disabled,
  dragging,
  dropTarget,
  onToggle,
  onSaveMeta,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveTo,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  item: MediaItem
  index: number
  total: number
  showMeta: boolean
  disabled: boolean
  dragging: boolean
  dropTarget: boolean
  onToggle: () => void
  onSaveMeta: (title: string, dateLabel: string) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveTo: (position: number) => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}) {
  const [title, setTitle] = useState(item.title)
  const [dateLabel, setDateLabel] = useState(item.dateLabel)
  const position = index + 1

  useEffect(() => {
    setTitle(item.title)
    setDateLabel(item.dateLabel)
  }, [item.id, item.title, item.dateLabel])

  return (
    <article
      className={`media-card${item.published ? '' : ' dimmed'}${dragging ? ' dragging' : ''}${dropTarget ? ' drop-target' : ''}`}
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        onDragEnter()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
      }}
      onDragEnd={onDragEnd}
    >
      <div className="media-card-preview">
        <span className="media-order-badge" aria-label={`Position ${position}`}>
          #{position}
        </span>
        {item.mediaType === 'video' ? (
          <video src={item.url} muted playsInline preload="metadata" controls />
        ) : (
          <img src={item.url} alt={item.title || 'Still'} loading="lazy" />
        )}
      </div>
      <div className="media-card-body">
        <div className="media-order-controls">
          <label className="media-order-select">
            <span>Order</span>
            <select
              value={position}
              disabled={disabled || total < 2}
              onChange={(e) => onMoveTo(Number(e.target.value))}
              aria-label="Display order"
            >
              {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                  {n === 1 ? ' (first)' : n === total ? ' (last)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="media-order-buttons">
            <button
              type="button"
              className="button secondary sm"
              disabled={disabled || index === 0}
              onClick={onMoveUp}
              aria-label="Move earlier"
            >
              ↑
            </button>
            <button
              type="button"
              className="button secondary sm"
              disabled={disabled || index === total - 1}
              onClick={onMoveDown}
              aria-label="Move later"
            >
              ↓
            </button>
          </div>
        </div>

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
