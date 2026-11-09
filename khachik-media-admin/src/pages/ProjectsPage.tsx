import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { deleteProject, isLoggedIn, listProjects, type Project } from '../api'
import { CATEGORIES } from '../types'

const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id

export function ProjectsPage() {
  const loggedIn = isLoggedIn()
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'live' | 'draft'>('all')

  useEffect(() => {
    if (!loggedIn) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listProjects()
        if (!cancelled) setProjects(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loggedIn])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects
      .filter((p) => {
        if (filter === 'live' && !p.published) return false
        if (filter === 'draft' && p.published) return false
        if (!q) return true
        return (
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [projects, query, filter])

  if (!loggedIn) return <Navigate to="/login" replace />

  async function onDelete(project: Project) {
    if (!confirm(`Delete “${project.title}”?`)) return
    try {
      await deleteProject(project.id)
      setProjects(await listProjects())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="stack loose">
      <div className="row between wrap">
        <div className="row wrap" style={{ flex: 1, minWidth: 220 }}>
          <input
            style={{ maxWidth: 320 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, client, slug…"
            aria-label="Search projects"
          />
          <div className="row">
            {(
              [
                ['all', 'All'],
                ['live', 'Live'],
                ['draft', 'Drafts'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`button sm ${filter === id ? 'primary' : 'secondary'}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {filtered.length} of {projects.length}
        </p>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="loading-block">Loading projects…</p> : null}

      {!loading ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">No projects match this view.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="project-cell">
                        {project.coverUrl && project.coverType !== 'video' ? (
                          <img className="thumb" src={project.coverUrl} alt="" />
                        ) : (
                          <div className="thumb placeholder">KM</div>
                        )}
                        <div>
                          <Link className="project-title" to={`/projects/${project.id}`}>
                            {project.title}
                          </Link>
                          <div className="project-slug">{project.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-chip">{categoryLabel(project.category)}</span>
                    </td>
                    <td>
                      <span className={`badge ${project.published ? 'live' : 'draft'}`}>
                        {project.published ? 'Live' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <span className="order-pill">{project.sortOrder}</span>
                    </td>
                    <td>
                      <div className="row end">
                        <Link className="button secondary sm" to={`/projects/${project.id}`}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="button danger sm"
                          onClick={() => void onDelete(project)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
