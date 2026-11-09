import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ProjectEditorPage } from './pages/ProjectEditorPage'
import { ProjectsPage } from './pages/ProjectsPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectEditorPage />} />
        <Route path="/projects/:id" element={<ProjectEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
