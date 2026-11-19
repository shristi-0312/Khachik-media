import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/AdminShell'
import { LoginPage } from './pages/LoginPage'
import { MediaLibraryPage } from './pages/MediaLibraryPage'
import { OverviewPage } from './pages/OverviewPage'
import { ABOUT_SECTIONS, FILMS_SECTIONS, GLOBE_SECTIONS } from './types'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AdminShell />}>
          <Route path="/" element={<OverviewPage />} />
          <Route
            path="/films"
            element={
              <MediaLibraryPage
                title="Films"
                subtitle="Category grid videos"
                tabs={FILMS_SECTIONS}
                accept="video"
                showMeta
              />
            }
          />
          <Route
            path="/stills"
            element={
              <MediaLibraryPage
                title="Stills"
                subtitle="Photography grid"
                tabs={[{ id: 'stills', label: 'Stills' }]}
                accept="image"
              />
            }
          />
          <Route
            path="/globe"
            element={
              <MediaLibraryPage
                title="Globe"
                subtitle="Home sphere HQ clips"
                tabs={GLOBE_SECTIONS}
                accept="video"
              />
            }
          />
          <Route
            path="/about"
            element={
              <MediaLibraryPage
                title="About"
                subtitle="Featured grid on the About page — stills or videos"
                tabs={ABOUT_SECTIONS}
                accept="any"
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
