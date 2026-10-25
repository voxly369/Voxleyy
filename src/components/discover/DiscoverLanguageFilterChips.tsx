import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { discoverFiltersToSearchParams, parseDiscoverFilters } from '../../lib/discover/filterParams.ts'
import { languageDisplayName } from '../../lib/languages/languageName.ts'
import { HorizontalChipRow } from './HorizontalChipRow.tsx'

const FEATURED_LANGUAGE_CODES = ['en', 'af', 'zu', 'xh', 'fr', 'es', 'pt', 'ar', 'de', 'hi'] as const

export function DiscoverLanguageFilterChips() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const filters = parseDiscoverFilters(params)
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

  function toggle(code: string) {
    const next = new Set(filters.languages ?? [])
    if (next.has(code)) next.delete(code)
    else next.add(code)
    const languages = [...next].sort()
    const merged = { ...filters, languages: languages.length ? languages : undefined, language: undefined }
    const nextParams = discoverFiltersToSearchParams(merged)
    navigate(`/discover/browse?${nextParams.toString()}`)
  }

  return (
    <div data-testid="discover-language-filters">
      <HorizontalChipRow
        title="Languages"
        variant="filter"
        chips={chips.map((chip) => ({
          ...chip,
          onSelect: () => toggle(chip.id),
        }))}
      />
    </div>
  )
}
