import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { parseDiscoverFilters } from '../lib/discover/filterParams.ts'
import { listDiscoverPosts } from '../lib/discover/listDiscover.ts'
import type { FeedPost } from '../lib/feed/types.ts'
import type { FeedCursor } from '../lib/feed/cursor.ts'
import { DiscoverPostStrip } from '../components/discover/DiscoverPostStrip.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { DiscoverLanguageFilterChips } from '../components/discover/DiscoverLanguageFilterChips.tsx'
import { languageFilterEmptyMessage } from '../lib/languages/showPostLanguageLabel.ts'

export default function DiscoverBrowsePage() {
  const [params] = useSearchParams()
  const filters = parseDiscoverFilters(params)
  const filterKey = params.toString()
  useDocumentTitle('Browse')

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<FeedCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    void listDiscoverPosts('filtered', filters, null).then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setError(null)
      setPosts(result.data.posts)
      setCursor(result.data.nextCursor)
    })
    return () => {
      active = false
    }
  }, [filterKey, filters])

  function onPostUpdate(postId: string, patch: Partial<FeedPost>) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)))
  }

  return (
    <FeedWithRailLayout>
      <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
        <PageHeader title="Browse" />
        <DiscoverLanguageFilterChips page="browse" />
        {loading ? <Skeleton variant="text-lines" lines={6} /> : null}
        {error ? <ErrorState title="Results did not load" message={error} onRetry={() => window.location.reload()} /> : null}
        {!loading && !error && posts.length === 0 ? (
          <EmptyState
            title="Nothing matched"
            message={languageFilterEmptyMessage(Boolean(filters.languages?.length), 'browse')}
            dataTestId="browse-language-empty"
          />
        ) : null}
        {!loading && !error ? <DiscoverPostStrip posts={posts} layout="grid" onPostUpdate={onPostUpdate} /> : null}
        {cursor ? (
          <button
            type="button"
            className={`min-h-11 self-center rounded-2xl border border-line px-4 ${focusRing}`}
            onClick={() =>
              void listDiscoverPosts('filtered', filters, cursor).then((result) => {
                if (!result.ok) return
                setPosts((prev) => [...prev, ...result.data.posts])
                setCursor(result.data.nextCursor)
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
