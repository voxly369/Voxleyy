import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEARCH_INPUT_LIMITS, sanitizeSearchInput } from '../../lib/discover/searchInput.ts'
import { focusRing } from '../shell/navItems.ts'

type DiscoverSearchFieldProps = {
  defaultValue?: string
  autoNavigate?: boolean
  className?: string
}

export function DiscoverSearchField({ defaultValue = '', autoNavigate = false, className = '' }: DiscoverSearchFieldProps) {
  const id = useId()
  const navigate = useNavigate()
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (!autoNavigate) return
    const safe = sanitizeSearchInput(value)
    if (safe.length < SEARCH_INPUT_LIMITS.min) return
    const timer = window.setTimeout(() => {
      navigate(`/discover/search?q=${encodeURIComponent(safe)}`, { replace: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [autoNavigate, navigate, value])

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const safe = sanitizeSearchInput(value)
    if (safe.length < SEARCH_INPUT_LIMITS.min) return
    navigate(`/discover/search?q=${encodeURIComponent(safe)}`)
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <label htmlFor={id} className="sr-only">
        Search Voxly
      </label>
      <input
        id={id}
        type="search"
        value={value}
        maxLength={SEARCH_INPUT_LIMITS.max}
        placeholder="Search writers, posts, and tags"
        onChange={(event) => setValue(event.target.value)}
        className={`min-h-11 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink ${focusRing}`}
        data-testid="discover-search-input"
      />
    </form>
  )
}
