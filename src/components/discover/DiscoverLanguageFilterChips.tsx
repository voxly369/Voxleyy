import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { discoverFiltersToSearchParams, parseDiscoverFilters } from '../../lib/discover/filterParams.ts'
import { languageDisplayName } from '../../lib/languages/languageName.ts'
import { parseLanguagesFilter } from '../../lib/languages/parseLanguagesFilter.ts'
import { fetchMyProfilePreferences } from '../../lib/onboarding/api.ts'
import { focusRing } from '../shell/navItems.ts'
import { HorizontalChipRow } from './HorizontalChipRow.tsx'

const FEATURED_LANGUAGE_CODES = ['en', 'af', 'zu', 'xh', 'fr', 'es', 'pt', 'ar', 'de', 'hi'] as const

export type LanguageFilterPage = 'browse' | 'search' | 'discover'

type DiscoverLanguageFilterChipsProps = {
  page: LanguageFilterPage
}

export function DiscoverLanguageFilterChips({ page }: DiscoverLanguageFilterChipsProps) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const filters = parseDiscoverFilters(params)
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([])

  useEffect(() => {
    let active = true
    void fetchMyProfilePreferences().then((result) => {
      if (!active || !result.ok) return
      setPreferredLanguages(parseLanguagesFilter(result.data.languages.join(',')))
    })
    return () => {
      active = false
    }
  }, [])

  const chips = useMemo(() => {
    const selected = new Set(filters.languages ?? [])
    const featured = FEATURED_LANGUAGE_CODES.map((code) => ({
      id: code,
      label: languageDisplayName(code),
      selected: selected.has(code),
    }))
    const extras = (filters.languages ?? [])
      .filter((code) => !FEATURED_LANGUAGE_CODES.includes(code as (typeof FEATURED_LANGUAGE_CODES)[number]))
      .map((code) => ({
        id: code,
        label: languageDisplayName(code),
        selected: true,
      }))
    return [...featured, ...extras]
  }, [filters.languages])

  function navigateWithFilters(languages: string[] | undefined) {
    const merged = {
      ...filters,
      languages: languages?.length ? languages : undefined,
      language: undefined,
    }
    const nextParams = discoverFiltersToSearchParams(merged)
    if (page === 'search') {
      const q = params.get('q')
      if (q) nextParams.set('q', q)
      navigate(`/discover/search?${nextParams.toString()}`)
      return
    }
    if (page === 'browse') {
      navigate(`/discover/browse?${nextParams.toString()}`)
      return
    }
    navigate(`/discover/browse?${nextParams.toString()}`)
  }

  function toggle(code: string) {
    const next = new Set(filters.languages ?? [])
    if (next.has(code)) next.delete(code)
    else next.add(code)
    navigateWithFilters([...next].sort())
  }

  function applyMyLanguages() {
    if (preferredLanguages.length === 0) return
    navigateWithFilters([...preferredLanguages].sort())
  }

  const myLanguagesActive =
    preferredLanguages.length > 0 &&
    filters.languages?.length === preferredLanguages.length &&
    preferredLanguages.every((code) => filters.languages?.includes(code))

  return (
    <div className="flex flex-col gap-2" data-testid="discover-language-filters">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="language-filter-my-languages"
          disabled={preferredLanguages.length === 0}
          aria-pressed={myLanguagesActive}
          onClick={applyMyLanguages}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium ${
            myLanguagesActive ? 'border-coral bg-coral/15 text-ink' : 'border-line bg-surface text-ink'
          } ${focusRing}`}
        >
          My languages
        </button>
      </div>
      <HorizontalChipRow
        title="Languages"
        variant="filter"
        chips={chips.map((chip) => ({
          ...chip,
          onSelect: () => toggle(chip.id),
        }))}
      />
      {location.pathname.includes('/discover') && page === 'discover' ? (
        <p className="sr-only" data-testid="discover-language-filter-hint">
          Language filters open browse results.
        </p>
      ) : null}
    </div>
  )
}
