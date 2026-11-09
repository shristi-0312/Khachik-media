import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { deleteProject, isLoggedIn, listProjects, logout, type Project } from '../api'

export function ProjectsPage() {
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
    <main className="page">
      <header className="row between">
        <div>
          <h1>Projects</h1>
          <p className="muted">{localStorage.getItem('km_email')}</p>
        </div>
        <div className="row">
          <Link className="button" to="/projects/new">
            New project
          </Link>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              logout()
              window.location.href = '/admin/login'
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Published</th>
            <th>Order</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <Link to={`/projects/${project.id}`}>{project.title}</Link>
                <div className="muted">{project.slug}</div>
              </td>
              <td>{project.category}</td>
              <td>{project.published ? 'Yes' : 'Draft'}</td>
              <td>{project.sortOrder}</td>
              <td className="row end">
                <Link to={`/projects/${project.id}`}>Edit</Link>
                <button type="button" className="danger" onClick={() => void onDelete(project)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
