import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HomeGreeting } from '../components/home/HomeGreeting.tsx'
import { HomeChecklistCard } from '../components/home/HomeChecklistCard.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { fetchMyProfilePreferences, patchMyProfilePreferences } from '../lib/onboarding/api.ts'
import { fetchChecklistSignals } from '../lib/home/checklistSignals.ts'
import { getUserStreaks } from '../lib/streaks/api.ts'
import { liveCurrentStreak } from '../lib/streaks/liveCurrentStreak.ts'
import { fetchDailyQuoteForDay } from '../lib/entrance/dailyQuoteView.ts'
import { localDateKey } from '../lib/home/greeting.ts'
import { supabase } from '../lib/supabaseClient.ts'
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
  const { profile, isFounder } = useAuth()
  const [tab, setTab] = useState<FeedTab>('home')
  const [dailyPrompt, setDailyPrompt] = useState<string | null>(null)
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null)
  const [writingStreak, setWritingStreak] = useState<number | null>(null)
  const [continueCount, setContinueCount] = useState(0)
  const [checklistDismissed, setChecklistDismissed] = useState(true)
  const [checklistSignals, setChecklistSignals] = useState<Awaited<ReturnType<typeof fetchChecklistSignals>> | null>(null)
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
    if (!profile?.id) return
    void supabase.rpc('writing_prompt_for_date').then(({ data }) => {
      if (typeof data === 'string') setDailyPrompt(data)
    })
    void fetchDailyQuoteForDay(localDateKey(profile.timezone ?? 'UTC'), profile.timezone ?? 'UTC').then((quote) => {
      setDailyQuote({ text: quote.text, author: quote.author })
    })
    if (profile.role === 'writer') {
      void getUserStreaks(profile.id).then((result) => {
        if (result.ok) {
          setWritingStreak(liveCurrentStreak(result.data.writing, profile.timezone ?? 'UTC'))
        }
      })
    } else {
      void import('../lib/library/listLibrary.ts').then(({ listContinueReading }) =>
        listContinueReading().then((result) => {
          if (result.ok) setContinueCount(result.items.length)
        }),
      )
    }
    void fetchMyProfilePreferences().then((prefs) => {
      if (prefs.ok) setChecklistDismissed(Boolean(prefs.data.checklist_dismissed_at))
    })
    void fetchChecklistSignals(profile.id, profile.bio ?? null).then(setChecklistSignals)
  }, [profile?.id, profile?.role, profile?.timezone, profile?.bio])

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
      {profile ? (
        <HomeGreeting
          displayName={profile.display_name?.trim() || profile.username}
          timezone={profile.timezone ?? 'UTC'}
          countryCode={profile.country ?? null}
          role={profile.role === 'writer' ? 'writer' : 'reader'}
          writingStreak={writingStreak}
          dailyPrompt={dailyPrompt}
          dailyQuote={dailyQuote}
          continueReadingCount={continueCount}
        />
      ) : null}
      {!isFounder && profile && checklistSignals ? (
        <HomeChecklistCard
          signals={checklistSignals}
          dismissed={checklistDismissed}
          onDismiss={() => {
            setChecklistDismissed(true)
            void patchMyProfilePreferences({ checklist_dismissed_at: new Date().toISOString() })
          }}
        />
      ) : null}
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
          <EmptyState
            title="The page is quiet — for now"
            message="Follow a few writers or explore Discover; fresh work lands here as they publish."
            action={
              <Link to="/discover" className="min-h-11 inline-flex items-center rounded-2xl bg-coral px-4 text-sm font-semibold text-white">
                Discover writers
              </Link>
            }
          />
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
