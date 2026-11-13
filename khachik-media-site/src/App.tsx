import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ContactModal } from './components/ContactModal'
import { Loader } from './components/Loader'
import { ThemeSync } from './components/ThemeSync'
import { ContactProvider } from './context/ContactContext'
import { ProjectsProvider } from './context/ProjectsContext'
import { AboutPage } from './pages/AboutPage'
import { FilmsPage } from './pages/FilmsPage'
import { HomePage } from './pages/HomePage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { StillsPage } from './pages/StillsPage'
import './App.css'

function SiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/films" element={<FilmsPage />} />
      <Route path="/stills" element={<StillsPage />} />
      <Route path="/projects" element={<Navigate to="/films" replace />} />
      <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Dark showcase — same layout, Figma dark colors, no toggle UI */}
      <Route path="/dark" element={<HomePage />} />
      <Route path="/dark/films" element={<FilmsPage />} />
      <Route path="/dark/stills" element={<StillsPage />} />
      <Route path="/dark/projects" element={<Navigate to="/dark/films" replace />} />
      <Route path="/dark/projects/:slug" element={<ProjectDetailPage />} />
      <Route path="/dark/about" element={<AboutPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [booting, setBooting] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).has('loader')) {
        sessionStorage.removeItem('km-booted')
        return true
      }
      return sessionStorage.getItem('km-booted') !== '1'
    } catch {
      return true
    }
  })
  const finish = useCallback(() => {
    try {
      sessionStorage.setItem('km-booted', '1')
    } catch {
      /* ignore */
    }
    setBooting(false)
  }, [])

  return (
    <ContactProvider>
      <ProjectsProvider>
        <BrowserRouter>
          {booting ? <Loader onDone={finish} /> : null}
          <ThemeSync />
          <div className={`app-shell ${booting ? 'booting' : ''}`}>
            <SiteRoutes />
          </div>
          <ContactModal />
        </BrowserRouter>
      </ProjectsProvider>
    </ContactProvider>
  )
}
