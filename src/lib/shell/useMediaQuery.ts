import { useEffect, useState } from 'react'

function readQuery(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/** SSR-safe matchMedia hook; defaults to `false` when matchMedia is unavailable. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readQuery(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const sync = () => setMatches(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [query])

  return matches
}

export const DESKTOP_NAV_QUERY = '(min-width: 1024px)'
export const RIGHT_RAIL_QUERY = '(min-width: 1280px)'
