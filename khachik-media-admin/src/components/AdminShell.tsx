import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { isLoggedIn, logout } from '../api'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Overview',
    subtitle: 'A quick look at your projects',
  },
  '/projects': {
    title: 'Projects',
    subtitle: 'Search, edit, and publish work',
  },
}

function resolveMeta(pathname: string) {
  if (pathname.startsWith('/projects/')) {
    const isNew = pathname.endsWith('/new')
    return {
      title: isNew ? 'New project' : 'Edit project',
      subtitle: isNew ? 'Add a new project to the site' : 'Update details, media, and status',
    }
  }
  return TITLES[pathname] ?? { title: 'Admin', subtitle: 'Khachik Media' }
}

export function AdminShell() {
  const { pathname } = useLocation()
  const meta = resolveMeta(pathname)
  const email = localStorage.getItem('km_email') ?? 'Signed in'

  if (!isLoggedIn()) return <Navigate to="/login" replace />

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">KM</div>
          <div className="brand-copy">
            <span className="brand-name">Khachik</span>
            <span className="brand-sub">Admin</span>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <OverviewIcon />
            <span className="nav-label">Overview</span>
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <ProjectsIcon />
            <span className="nav-label">Projects</span>
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="user-email">{email}</div>
          <button
            type="button"
            className="button secondary sm"
            onClick={() => {
              logout()
              window.location.href = '/admin/login'
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          {pathname === '/projects' || pathname === '/' ? (
            <Link className="button primary" to="/projects/new">
              New project
            </Link>
          ) : null}
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function OverviewIcon() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ProjectsIcon() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3.2L11 7h6.5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}
