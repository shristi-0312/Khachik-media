import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ContactModal } from './components/ContactModal'
import { Loader } from './components/Loader'
import { ThemeSync } from './components/ThemeSync'
import { ContactProvider } from './context/ContactContext'
import { AboutPage } from './pages/AboutPage'
import { HomePage } from './pages/HomePage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import './App.css'

function SiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Dark showcase — same layout, Figma dark colors, no toggle UI */}
      <Route path="/dark" element={<HomePage />} />
      <Route path="/dark/projects" element={<ProjectsPage />} />
      <Route path="/dark/projects/:slug" element={<ProjectDetailPage />} />
      <Route path="/dark/about" element={<AboutPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [booting, setBooting] = useState(() => {
    try {
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
      <BrowserRouter>
        {booting ? <Loader onDone={finish} /> : null}
        <ThemeSync />
        <div className={`app-shell ${booting ? 'booting' : ''}`}>
          <SiteRoutes />
        </div>
        <ContactModal />
      </BrowserRouter>
    </ContactProvider>
  )
}
