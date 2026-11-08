import { useEffect } from 'react'
import { useIsDarkTheme } from '../hooks/useBasePath'

/** Applies Figma dark tokens via `data-theme` — no UI toggle. */
export function ThemeSync() {
  const dark = useIsDarkTheme()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    return () => {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [dark])

  return null
}
