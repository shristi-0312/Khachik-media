import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { isLoggedIn, listProjects, type Project } from '../api'
import { CATEGORIES } from '../types'

export function OverviewPage() {
  const loggedIn = isLoggedIn()
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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

  const stats = useMemo(() => {
    const published = projects.filter((p) => p.published).length
    const drafts = projects.length - published
    const byCategory = CATEGORIES.map((cat) => ({
      ...cat,
      count: projects.filter((p) => p.category === cat.id).length,
    }))
    const recent = [...projects]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 5)
    return { published, drafts, byCategory, recent }
  }, [projects])

  if (!loggedIn) return <Navigate to="/login" replace />

  return (
    <div className="stack loose">
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="loading-block">Loading studio pulse…</p> : null}

      {!loading ? (
        <>
          <div className="grid4">
            <article className="stat-card">
              <p className="stat-label">Total projects</p>
              <p className="stat-value">{projects.length}</p>
              <p className="stat-meta">In the catalogue</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Published</p>
              <p className="stat-value">{stats.published}</p>
              <p className="stat-meta">Live on the site</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Drafts</p>
              <p className="stat-value">{stats.drafts}</p>
              <p className="stat-meta">Waiting to go live</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Categories</p>
              <p className="stat-value">{CATEGORIES.length}</p>
              <p className="stat-meta">Active lanes</p>
            </article>
          </div>

          <div className="grid2">
            <section className="panel">
              <div className="section-head">
                <div>
                  <h2>By category</h2>
                  <p>Distribution across the four lanes</p>
                </div>
              </div>
              <div className="category-bars">
                {stats.byCategory.map((cat) => {
                  const pct = projects.length ? Math.round((cat.count / projects.length) * 100) : 0
                  return (
                    <div className="category-row" key={cat.id}>
                      <span>{cat.label}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <strong>{cat.count}</strong>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="panel">
              <div className="section-head">
                <div>
                  <h2>Top of order</h2>
                  <p>First five by sort position</p>
                </div>
                <Link className="button secondary sm" to="/projects">
                  View all
                </Link>
              </div>
              <div className="recent-list">
                {stats.recent.length === 0 ? (
                  <p className="empty">No projects yet.</p>
                ) : (
                  stats.recent.map((project) => (
                    <Link className="recent-item" key={project.id} to={`/projects/${project.id}`}>
                      <div>
                        <div className="project-title">{project.title}</div>
                        <div className="project-slug">{project.slug}</div>
                      </div>
                      <span className={`badge ${project.published ? 'live' : 'draft'}`}>
                        {project.published ? 'Live' : 'Draft'}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}
