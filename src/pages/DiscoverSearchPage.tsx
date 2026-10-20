import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { DiscoverSearchField } from '../components/discover/DiscoverSearchField.tsx'
import { isSearchQueryReady } from '../lib/discover/searchInput.ts'
import { runSearch, type SearchResults, type SearchTab } from '../lib/discover/searchApi.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { DiscoverFollowButton } from '../components/discover/DiscoverFollowButton.tsx'
import { formatCountLabel } from '../lib/formatCountLabel.ts'
import { tagPagePath } from '../lib/discover/tagLink.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

const TABS: { id: SearchTab; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'writers', label: 'Writers' },
  { id: 'posts', label: 'Posts' },
  { id: 'tags', label: 'Tags' },
]

export default function DiscoverSearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const [tab, setTab] = useState<SearchTab>('top')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResults | null>(null)

  useDocumentTitle(query ? `Search: ${query}` : 'Search')

  useEffect(() => {
    if (!isSearchQueryReady(query)) {
      setResults(null)
      setError(null)
      return
    }
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      void runSearch(query, tab).then((result) => {
        if (!active) return
        setLoading(false)
        if (!result.ok) {
          setError(result.message)
          setResults(null)
          return
        }
        setError(null)
        setResults(result.data)
      })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, tab])

  return (
    <FeedWithRailLayout>
      <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
        <PageHeader title="Search" />
        <DiscoverSearchField defaultValue={query} />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Search result types">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === item.id ? 'bg-coral text-white' : 'border border-line bg-surface text-muted'
              } ${focusRing}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!isSearchQueryReady(query) ? (
          <EmptyState title="Keep typing" message="Enter at least two characters to search." />
        ) : loading ? (
          <Skeleton variant="text-lines" lines={5} />
        ) : error ? (
          <ErrorState title="Search did not work" message={error} onRetry={() => window.location.reload()} />
        ) : results ? (
          <div className="flex flex-col gap-8">
            {(tab === 'top' || tab === 'writers') && results.writers.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold text-ink">Writers</h2>
                <ul className="flex flex-col gap-2">
                  {results.writers.map((writer) => (
                    <li key={writer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
                      <Link to={`/u/${writer.username}`} className={`min-h-11 flex-1 ${focusRing}`}>
                        <span className="font-medium text-ink">{writer.displayName || writer.username}</span>
                        <span className="block text-sm text-muted">
                          @{writer.username} · {formatCountLabel(writer.followerCount, 'follower')}
                        </span>
                      </Link>
                      <DiscoverFollowButton userId={writer.id} username={writer.username} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {(tab === 'top' || tab === 'posts') && results.posts.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold text-ink">Posts</h2>
                <ul className="flex flex-col gap-3">
                  {results.posts.map((post) => (
                    <li key={post.id} className="rounded-2xl border border-line p-4">
                      <Link to={`/c/${post.id}`} className={`block ${focusRing}`}>
                        <p className="font-medium text-ink">{post.title?.trim() || 'Untitled'}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{post.bodyExcerpt}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {(tab === 'top' || tab === 'tags') && results.tags.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold text-ink">Tags</h2>
                <ul className="flex flex-col gap-2">
                  {results.tags.map((tag) => (
                    <li key={tag.tag}>
                      <Link to={tagPagePath(tag.tag)} className={`min-h-11 inline-flex items-center gap-2 ${focusRing}`}>
                        <span className="font-medium text-ink">#{tag.tag}</span>
                        <span className="text-sm text-muted">{formatCountLabel(tag.postCount, 'work')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {results.writers.length === 0 && results.posts.length === 0 && results.tags.length === 0 ? (
              <EmptyState title="No results" message={`Nothing matched “${query}”. Try another search.`} />
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </FeedWithRailLayout>
  )
}
