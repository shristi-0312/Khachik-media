import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { isLoggedIn, logout } from '../api'

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Overview',
    subtitle: 'Media library pulse',
  },
  '/films': {
    title: 'Films',
    subtitle: 'Socials · Promo Events',
  },
  '/stills': {
    title: 'Stills',
    subtitle: 'Photography for the Stills page',
  },
  '/globe': {
    title: 'Globe',
    subtitle: 'High-quality clips for the home sphere',
  },
  '/about': {
    title: 'About',
    subtitle: 'Featured stills & videos for the About page',
  },
}

export function AdminShell() {
  const { pathname } = useLocation()
  const meta = TITLES[pathname] ?? { title: 'Admin', subtitle: 'Khachik Media' }
  const email = localStorage.getItem('km_email') ?? 'Signed in'

  if (!isLoggedIn()) return <Navigate to="/login" replace />

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">KM</div>
          <div className="brand-copy">
            <span className="brand-name">Khachik</span>
            <span className="brand-sub">Media library</span>
          </div>
        </div>

        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <OverviewIcon />
            <span className="nav-label">Overview</span>
          </NavLink>
          <NavLink to="/films" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <FilmsIcon />
            <span className="nav-label">Films</span>
          </NavLink>
          <NavLink to="/stills" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <StillsIcon />
            <span className="nav-label">Stills</span>
          </NavLink>
          <NavLink to="/globe" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <GlobeIcon />
            <span className="nav-label">Globe</span>
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <AboutIcon />
            <span className="nav-label">About</span>
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="user-email">{email}</div>
          <button
            type="button"
            className="button secondary sm"
            onClick={() => {
              logout()
              window.location.href = `${import.meta.env.BASE_URL}login`.replace(/\/{2,}/g, '/')
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

function FilmsIcon() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
    </svg>
  )
}

function StillsIcon() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 16l4.5-3.5L12 16l3-2.5L21 16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16M12 4c-2.5 2.8-2.5 13.2 0 16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function AboutIcon() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9h10M7 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
