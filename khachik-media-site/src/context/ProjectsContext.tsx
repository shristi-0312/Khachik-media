import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiConfigured, fetchProjects } from '../api/client'
import { PROJECTS as FALLBACK_PROJECTS, type Project } from '../data/content'

type ProjectsContextValue = {
  projects: Project[]
  loading: boolean
  error: string | null
  fromApi: boolean
  getProject: (slug: string) => Project | undefined
  getNextProject: (slug: string) => Project
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS)
  const [loading, setLoading] = useState(apiConfigured())
  const [error, setError] = useState<string | null>(null)
  const [fromApi, setFromApi] = useState(false)

  useEffect(() => {
    if (!apiConfigured()) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const remote = await fetchProjects()
        if (cancelled) return
        if (remote.length) {
          setProjects(remote)
          setFromApi(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load projects')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<ProjectsContextValue>(() => {
    function getProject(slug: string) {
      return projects.find((p) => p.slug === slug)
    }
    function getNextProject(slug: string) {
      const i = projects.findIndex((p) => p.slug === slug)
      if (i < 0) return projects[0] ?? FALLBACK_PROJECTS[0]
      return projects[(i + 1) % projects.length]
    }
    return { projects, loading, error, fromApi, getProject, getNextProject }
  }, [projects, loading, error, fromApi])

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider')
  return ctx
}
