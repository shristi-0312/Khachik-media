import { useLocation } from 'react-router-dom'

/** Prefix for dark showcase routes (`/dark`) or empty for light. */
export function useBasePath() {
  const { pathname } = useLocation()
  return pathname === '/dark' || pathname.startsWith('/dark/') ? '/dark' : ''
}

export function useIsDarkTheme() {
  return useBasePath() === '/dark'
}
