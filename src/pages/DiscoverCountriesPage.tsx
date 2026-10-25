import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { countryFlag } from '../lib/profiles/countries.ts'
import { listCountriesBrowse, type CountryBrowseRow } from '../lib/country/api.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function DiscoverCountriesPage() {
  useDocumentTitle('Browse countries')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<CountryBrowseRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    void listCountriesBrowse(query, null).then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setError(null)
      setRows(result.rows)
      setCursor(result.nextCursor)
    })
    return () => {
      active = false
    }
  }, [query])

  return (
    <FeedWithRailLayout>
      <PageContainer variant="wide" className="flex flex-col gap-6 py-8" testId="browse-countries-page">
        <PageHeader title="Browse countries" />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-ink">Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or code"
            className={`min-h-11 rounded-2xl border border-line bg-bg px-3 ${focusRing}`}
            data-testid="browse-countries-search"
          />
        </label>
        {loading ? <Skeleton variant="text-lines" lines={8} /> : null}
        {error ? <ErrorState title="Countries did not load" message={error} onRetry={() => window.location.reload()} /> : null}
        {!loading && !error ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li key={row.code}>
                <Link
                  to={`/country/${row.code}`}
                  className={`flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 ${focusRing}`}
                  data-testid="browse-countries-row"
                >
                  <span aria-hidden="true">{countryFlag(row.code)}</span>
                  <span className="text-ink">{row.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {cursor ? (
          <button
            type="button"
            className={`min-h-11 self-center rounded-2xl border border-line px-4 ${focusRing}`}
            onClick={() =>
              void listCountriesBrowse(query, cursor).then((result) => {
                if (!result.ok) return
                setRows((prev) => [...prev, ...result.rows])
                setCursor(result.nextCursor)
              })
            }
          >
            Load more
          </button>
        ) : null}
      </PageContainer>
    </FeedWithRailLayout>
  )
}
