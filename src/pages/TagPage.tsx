import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { normalizeTagRouteParam } from '../lib/discover/tagLink.ts'
import { listTagPosts, tagPublicPostCount } from '../lib/discover/listTagPosts.ts'
import type { FeedPost } from '../lib/feed/types.ts'
import type { FeedCursor } from '../lib/feed/cursor.ts'
import { DiscoverPostStrip } from '../components/discover/DiscoverPostStrip.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { formatCountLabel } from '../lib/formatCountLabel.ts'
import { focusRing } from '../components/shell/navItems.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function TagPage() {
  const { tag = '' } = useParams()
  const normalized = normalizeTagRouteParam(tag)
  useDocumentTitle(normalized ? `#${normalized}` : 'Tag')

  const [sort, setSort] = useState<'top' | 'recent'>('top')
  const [count, setCount] = useState<number | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<FeedCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!normalized) return
    void tagPublicPostCount(normalized).then(setCount)
  }, [normalized])

  useEffect(() => {
    if (!normalized) return
    let active = true
    setLoading(true)
    void listTagPosts(normalized, sort, null).then((result) => {
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
  }, [normalized, sort])

  if (!normalized) {
    return (
      <PageContainer variant="wide" className="py-8">
        <EmptyState title="Tag not found" message="That tag is not valid." />
      </PageContainer>
    )
  }

  function onPostUpdate(postId: string, patch: Partial<FeedPost>) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)))
  }

  return (
    <FeedWithRailLayout>
      <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
        <PageHeader title={`#${normalized}`} />
        {count !== null ? (
          <p className="text-sm text-muted">{formatCountLabel(count, 'work')} in this tag</p>
        ) : null}
        <div className="flex gap-2">
          {(['top', 'recent'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                sort === value ? 'bg-coral text-white' : 'border border-line bg-surface text-muted'
              } ${focusRing}`}
            >
              {value === 'top' ? 'Top' : 'Recent'}
            </button>
          ))}
        </div>
        {loading ? <Skeleton variant="text-lines" lines={5} /> : null}
        {error ? <ErrorState title="Tag did not load" message={error} onRetry={() => window.location.reload()} /> : null}
        {!loading && !error && posts.length === 0 ? (
          <EmptyState title="No posts yet" message="Public posts with this tag will appear here." />
        ) : null}
        {!loading && !error ? <DiscoverPostStrip posts={posts} layout="grid" onPostUpdate={onPostUpdate} /> : null}
        {cursor ? (
          <button
            type="button"
            className={`min-h-11 self-center rounded-2xl border border-line px-4 ${focusRing}`}
            onClick={() =>
              void listTagPosts(normalized, sort, cursor).then((result) => {
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
