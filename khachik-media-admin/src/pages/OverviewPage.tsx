import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { isLoggedIn, listMedia, type MediaItem } from '../api'
import { ALL_SECTIONS, sectionLabel } from '../types'

export function OverviewPage() {
  const loggedIn = isLoggedIn()
  const [items, setItems] = useState<MediaItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loggedIn) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listMedia()
        if (!cancelled) setItems(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load media')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loggedIn])

  const stats = useMemo(() => {
    const published = items.filter((i) => i.published).length
    const bySection = ALL_SECTIONS.map((s) => ({
      ...s,
      count: items.filter((i) => i.section === s.id).length,
    }))
    return { published, drafts: items.length - published, bySection }
  }, [items])

  if (!loggedIn) return <Navigate to="/login" replace />

  return (
    <div className="stack loose">
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="loading-block">Loading library…</p> : null}

      {!loading ? (
        <>
          <div className="grid4">
            <article className="stat-card">
              <p className="stat-label">Total assets</p>
              <p className="stat-value">{items.length}</p>
              <p className="stat-meta">In the media library</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Published</p>
              <p className="stat-value">{stats.published}</p>
              <p className="stat-meta">Live on the site</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Hidden</p>
              <p className="stat-value">{stats.drafts}</p>
              <p className="stat-meta">Not shown publicly</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Sections</p>
              <p className="stat-value">{ALL_SECTIONS.length}</p>
              <p className="stat-meta">Films · Stills · Globe</p>
            </article>
          </div>

          <div className="grid2">
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Library</p>
                  <h2>By section</h2>
                </div>
              </div>
              <div className="category-bars">
                {stats.bySection.map((s) => (
                  <div className="category-row" key={s.id}>
                    <span>{s.label}</span>
                    <strong>{s.count}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Upload</p>
                  <h2>Where to go</h2>
                </div>
              </div>
              <div className="stack">
                <Link className="button secondary" to="/films">
                  Films — Short-forms, Promotional, Ads
                </Link>
                <Link className="button secondary" to="/stills">
                  Stills — photography grid
                </Link>
                <Link className="button secondary" to="/globe">
                  Globe — HQ horizontal & vertical clips
                </Link>
              </div>
              <p className="hint" style={{ marginTop: 16 }}>
                Files upload as originals to S3 and serve via CloudFront — no recompression.
              </p>
            </section>
          </div>

          {items.slice(0, 6).length ? (
            <section className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Recent</p>
                  <h2>Latest uploads</h2>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Section</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...items]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 6)
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{item.title || 'Untitled'}</td>
                          <td>{sectionLabel(item.section)}</td>
                          <td>{item.mediaType}</td>
                          <td>{item.published ? 'Live' : 'Hidden'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
