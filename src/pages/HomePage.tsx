import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeedSwitcher, type FeedTab } from '../components/feed/FeedSwitcher.tsx'
import { PostCard } from '../components/feed/PostCard.tsx'
import { CommentsSheet } from '../components/engagement/CommentsSheet.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import type { FeedCursor } from '../lib/feed/cursor.ts'
import { listFeed } from '../lib/feed/listFeed.ts'
import type { FeedKind, FeedPost } from '../lib/feed/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { feedOfflineMessage, isBrowserOnline } from '../lib/feed/offline.ts'
import { FeedWithRailLayout } from '../components/shell/FeedWithRailLayout.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'

function tabToKind(tab: FeedTab): FeedKind {
  return tab === 'following' ? 'following' : 'home'
}

export default function HomePage() {
  useDocumentTitle('Home')
  const [tab, setTab] = useState<FeedTab>('home')
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<FeedCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(() => !isBrowserOnline())
  const [commentsPost, setCommentsPost] = useState<FeedPost | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    function syncOnline() {
      setOffline(!isBrowserOnline())
    }
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)
    return () => {
      window.removeEventListener('online', syncOnline)
      window.removeEventListener('offline', syncOnline)
    }
  }, [])

  useEffect(() => {
    if (offline) return
    let active = true
    void (async () => {
      const result = await listFeed(tabToKind(tab), null)
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setPosts([])
        setCursor(null)
        setError(result.error.message)
        return
      }
      setError(null)
      setPosts(result.data.posts)
      setCursor(result.data.nextCursor)
    })()
    return () => {
      active = false
    }
  }, [tab, attempt, offline])

  const onTabChange = useCallback((next: FeedTab) => {
    setLoading(true)
    setError(null)
    setTab(next)
  }, [])

  async function loadMore() {
    if (!cursor || loadingMore || offline) return
    setLoadingMore(true)
    const result = await listFeed(tabToKind(tab), cursor)
    setLoadingMore(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setPosts((prev) => [...prev, ...result.data.posts])
    setCursor(result.data.nextCursor)
  }

  function onPostUpdate(postId: string, patch: Partial<FeedPost>) {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...patch } : post)))
  }

  if (offline) {
    return (
      <PageContainer variant="feed" className="flex flex-col gap-4 py-8">
        <FeedSwitcher active={tab} onChange={onTabChange} />
        <div role="status" className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
          {feedOfflineMessage()}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setOffline(!isBrowserOnline())
            setAttempt((n) => n + 1)
          }}
          className="min-h-11 rounded-2xl bg-coral px-5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </PageContainer>
    )
  }

  return (
    <FeedWithRailLayout>
      <div className="flex flex-col gap-4">
      <FeedSwitcher active={tab} onChange={onTabChange} />
      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton />
          <Skeleton />
        </div>
      ) : error ? (
        <ErrorState title="Feed did not load" message={error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : posts.length === 0 ? (
        tab === 'following' ? (
          <EmptyState
            title="Following"
            message="Follow writers to see their work here."
            action={
              <Link to="/discover" className="min-h-11 inline-flex items-center text-coral font-medium">
                Discover writers
              </Link>
            }
          />
        ) : (
          <EmptyState title="Home" message="When writers publish, their work will show up here." />
        )
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onCommentClick={setCommentsPost}
                onPostUpdate={onPostUpdate}
              />
            ))}
          </div>
          {cursor ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="min-h-11 rounded-2xl border border-line bg-surface px-4 text-sm font-medium"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </>
      )}
      {commentsPost ? (
        <CommentsSheet
          key={commentsPost.id}
          open={true}
          creationId={commentsPost.id}
          onClose={() => setCommentsPost(null)}
        />
      ) : null}
      </div>
    </FeedWithRailLayout>
  )
}
