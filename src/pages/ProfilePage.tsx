import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ProfileDisplayNamePrompt } from '../components/profile/ProfileDisplayNamePrompt.tsx'
import { ProfileHeader } from '../components/profile/ProfileHeader.tsx'
import { ProfileDraftsPanel } from '../components/profile/ProfileDraftsPanel.tsx'
import { ProfilePostsGrid } from '../components/profile/ProfilePostsGrid.tsx'
import { MissingProfile } from '../components/profile/MissingProfile.tsx'
import { BadgeShelf } from '../components/profile/BadgeShelf.tsx'
import { ProfileStreakChips } from '../components/profile/ProfileStreakChips.tsx'
import { ProfileTabBar } from '../components/profile/ProfileTabBar.tsx'
import { ProfileStorefrontTab } from '../components/profile/ProfileStorefrontTab.tsx'
import { ProfileAnalyticsTab } from '../components/profile/ProfileAnalyticsTab.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { getCreatorAnalytics } from '../lib/analytics/api.ts'
import type { CreatorAnalytics } from '../lib/analytics/types.ts'
import { listPinnedBadges, setFeaturedBook, tryClosePastMonths, getFeaturedBookId } from '../lib/badges/api.ts'
import type { PinnedBadge } from '../lib/badges/types.ts'
import { listUserPublished } from '../lib/creations/api.ts'
import { worksForPostsGrid } from '../lib/creations/profilePostsMapper.ts'
import type { PublishedCursor } from '../lib/creations/publishedCursor.ts'
import type { PublishedWorkSummary } from '../lib/creations/types.ts'
import { getProfileByUsername, isFollowing } from '../lib/profiles/api.ts'
import { pickMostPlayed } from '../lib/profiles/pickMostPlayed.ts'
import { visibleProfileTabs, type ProfileTabId } from '../lib/profiles/profileTabs.ts'
import type { PublicProfile } from '../lib/profiles/types.ts'
import {
  displayNamePromptDismissed,
  needsDisplayName,
} from '../lib/profiles/needsDisplayName.ts'
import { getUserStreaks, type UserStreaks } from '../lib/streaks/api.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { listAuthorBooks } from '../lib/books/booksApi.ts'
import type { BookRecord } from '../lib/books/bookSchema.ts'
import { useToast } from '../lib/shell/useToast.ts'

type View = {
  key: string
  profile: PublicProfile
  following: boolean
  followerCount: number
  works: PublishedWorkSummary[]
  nextCursor: PublishedCursor | null
}

const EMPTY_STREAKS: UserStreaks = {
  writing: { current: 0, longest: 0, lastActiveDay: null },
  reading: { current: 0, longest: 0, lastActiveDay: null },
}

function parseInitialTab(value: string | null, isOwn: boolean, role: PublicProfile['role']): ProfileTabId {
  const allowed = visibleProfileTabs({ isOwn, role }).map((tab) => tab.id)
  if (value && allowed.includes(value as ProfileTabId)) return value as ProfileTabId
  return 'posts'
}

export default function ProfilePage() {
  const { username = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { profile: me } = useAuth()
  const { showToast } = useToast()
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<View | null>(null)
  const [problem, setProblem] = useState<{ key: string; missing: boolean; message: string } | null>(null)
  const [tab, setTab] = useState<ProfileTabId>('posts')
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [namePromptDismissedVisit, setNamePromptDismissedVisit] = useState(false)
  const [ownBooks, setOwnBooks] = useState<BookRecord[]>([])
  const [storefrontBooks, setStorefrontBooks] = useState<BookRecord[]>([])
  const [featuredBookId, setFeaturedBookId] = useState<string | null>(null)
  const [pinnedBadges, setPinnedBadges] = useState<PinnedBadge[]>([])
  const [badgesLoading, setBadgesLoading] = useState(true)
  const [streaks, setStreaks] = useState<UserStreaks>(EMPTY_STREAKS)
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const key = username.toLowerCase()
  const current = view?.key === key ? view : null
  const activeProblem = problem?.key === key ? problem : null

  useDocumentTitle(current ? current.profile.displayName || current.profile.username : 'Profile')

  useEffect(() => {
    void tryClosePastMonths()
  }, [key, attempt])

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await getProfileByUsername(key)
      if (!active) return
      if (!result.ok) {
        setView(null)
        setProblem({
          key,
          missing: result.error.code === 'not_found',
          message: result.error.message,
        })
        return
      }
      const own = me?.id === result.data.id
      setTab(parseInitialTab(searchParams.get('tab'), own, result.data.role))
      const follow = own ? { ok: true as const, data: false } : await isFollowing(result.data.id)
      if (!active) return
      if (!follow.ok) {
        setView(null)
        setProblem({ key, missing: false, message: follow.error.message })
        return
      }
      const works = await listUserPublished(result.data.id, null)
      if (!active) return
      if (!works.ok) {
        setView(null)
        setProblem({ key, missing: false, message: works.error.message })
        return
      }
      setProblem(null)
      setLoadMoreError(null)
      setView({
        key,
        profile: result.data,
        following: follow.data,
        followerCount: result.data.followerCount,
        works: worksForPostsGrid(works.data.works),
        nextCursor: works.data.nextCursor,
      })
    })()
    return () => {
      active = false
    }
  }, [key, attempt, me?.id, searchParams])

  useEffect(() => {
    if (!current?.profile.id) return
    let active = true
    setBadgesLoading(true)
    void (async () => {
      const [pinned, streakResult, featured] = await Promise.all([
        listPinnedBadges(current.profile.id),
        getUserStreaks(current.profile.id),
        getFeaturedBookId(current.profile.id),
      ])
      if (!active) return
      setPinnedBadges(pinned.ok ? pinned.data : [])
      setStreaks(streakResult.ok ? streakResult.data : EMPTY_STREAKS)
      setFeaturedBookId(featured.ok ? featured.data : null)
      setBadgesLoading(false)
    })()
    return () => {
      active = false
    }
  }, [current?.profile.id])

  useEffect(() => {
    if (!current?.profile.id) {
      setStorefrontBooks([])
      return
    }
    void listAuthorBooks(current.profile.id).then((result) => {
      if (result.ok) setStorefrontBooks(result.data)
    })
  }, [current?.profile.id])

  useEffect(() => {
    if (!me?.id || !view || view.profile.id !== me.id) {
      setOwnBooks([])
      return
    }
    void listAuthorBooks(me.id).then((result) => {
      if (result.ok) setOwnBooks(result.data)
    })
  }, [me?.id, view?.profile.id])

  useEffect(() => {
    if (tab !== 'analytics' || !current || me?.id !== current.profile.id) return
    let active = true
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    void getCreatorAnalytics().then((result) => {
      if (!active) return
      setAnalyticsLoading(false)
      if (!result.ok) {
        setAnalyticsError(result.error.message)
        return
      }
      setAnalytics(result.data)
    })
    return () => {
      active = false
    }
  }, [tab, current, me?.id])

  async function loadMore() {
    if (!current?.nextCursor || loadingMore) return
    setLoadingMore(true)
    setLoadMoreError(null)
    const result = await listUserPublished(current.profile.id, current.nextCursor)
    setLoadingMore(false)
    if (!result.ok) {
      setLoadMoreError(result.error.message)
      return
    }
    setView((existing) => {
      if (!existing || existing.key !== key) return existing
      return {
        ...existing,
        works: [...existing.works, ...worksForPostsGrid(result.data.works)],
        nextCursor: result.data.nextCursor,
      }
    })
  }

  const isOwnProfile = me?.id === current?.profile.id
  const profileTabs = useMemo(
    () => (current ? visibleProfileTabs({ isOwn: isOwnProfile, role: current.profile.role }) : []),
    [current, isOwnProfile],
  )

  if (!current && !activeProblem) {
    return (
      <PageContainer variant="wide" className="flex flex-col gap-6 py-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <Skeleton />
        <Skeleton variant="circle" />
        <Skeleton variant="text-lines" lines={4} />
      </PageContainer>
    )
  }

  if (activeProblem?.missing) return <MissingProfile />
  if (!current) {
    return (
      <ErrorState
        title="Profile did not load"
        message={activeProblem?.message || 'We could not load this profile. Try again.'}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    )
  }

  const { profile } = current
  const joined = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt))
  const isOwn = isOwnProfile
  const showNamePrompt =
    isOwn &&
    Boolean(me) &&
    needsDisplayName(profile) &&
    !displayNamePromptDismissed(me!.id) &&
    !namePromptDismissedVisit
  const mostPlayed = pickMostPlayed(current.works)
  const gridWorks = mostPlayed ? current.works.filter((work) => work.id !== mostPlayed.id) : current.works

  async function onSetFeaturedBook(bookId: string) {
    const result = await setFeaturedBook(bookId)
    if (!result.ok) {
      showToast(result.error.message)
      return
    }
    setFeaturedBookId(bookId)
    showToast('Featured book updated')
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 pb-8">
      <ProfileHeader
        profile={profile}
        isOwn={isOwn}
        following={current.following}
        followerCount={current.followerCount}
        onFollowingChange={(next) => {
          setView((existing) => {
            if (!existing || existing.key !== key) return existing
            const delta = next === existing.following ? 0 : next ? 1 : -1
            return { ...existing, following: next, followerCount: existing.followerCount + delta }
          })
        }}
        badgeShelf={<BadgeShelf username={profile.username} pinned={pinnedBadges} loading={badgesLoading} />}
      />
      <ProfileStreakChips streaks={streaks} timeZone={profile.timezone} />
      {showNamePrompt && me ? (
        <ProfileDisplayNamePrompt userId={me.id} onDismiss={() => setNamePromptDismissedVisit(true)} />
      ) : null}
      <div className="px-5">
        <ProfileTabBar tabs={profileTabs} active={tab} onChange={setTab} />
        <div className="pt-5">
          {tab === 'posts' ? (
            <div role="tabpanel" id="panel-posts" aria-labelledby="tab-posts">
              {isOwn && ownBooks.length > 0 ? (
                <section aria-labelledby="profile-books-heading" className="mb-8 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="profile-books-heading" className="font-serif text-xl text-ink">
                      Your books
                    </h2>
                    <Link to="/books/new" className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}>
                      New book
                    </Link>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {ownBooks.map((book) => (
                      <li key={book.id}>
                        <Link
                          to={`/books/${book.id}/builder`}
                          className={`flex min-h-11 items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 ${focusRing}`}
                        >
                          <span className="font-medium text-ink">{book.title}</span>
                          <span className="text-sm text-muted">{book.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {mostPlayed ? (
                <section aria-labelledby="most-played-heading" className="mb-6 flex flex-col gap-2">
                  <h2 id="most-played-heading" className="font-serif text-xl text-ink">
                    Most played
                  </h2>
                  <ProfilePostsGrid
                    works={[mostPlayed]}
                    viewerId={me?.id ?? null}
                    onLoadMore={() => {}}
                    loadingMore={false}
                    hasMore={false}
                    loadMoreError={null}
                    onRetryLoadMore={() => {}}
                  />
                </section>
              ) : null}
              {current.works.length === 0 ? (
                <EmptyState title="No posts yet" message="Published public work appears here." />
              ) : (
                <ProfilePostsGrid
                  works={gridWorks}
                  viewerId={me?.id ?? null}
                  onLoadMore={() => void loadMore()}
                  loadingMore={loadingMore}
                  hasMore={Boolean(current.nextCursor)}
                  loadMoreError={loadMoreError}
                  onRetryLoadMore={() => void loadMore()}
                />
              )}
            </div>
          ) : null}
          {tab === 'storefront' ? (
            <div role="tabpanel" id="panel-storefront" aria-labelledby="tab-storefront">
              <ProfileStorefrontTab
                books={storefrontBooks}
                featuredBookId={featuredBookId}
                isOwn={isOwn}
                onSetFeatured={isOwn ? (bookId) => void onSetFeaturedBook(bookId) : undefined}
              />
            </div>
          ) : null}
          {tab === 'analytics' && isOwn ? (
            <div role="tabpanel" id="panel-analytics" aria-labelledby="tab-analytics">
              <ProfileAnalyticsTab data={analytics} loading={analyticsLoading} error={analyticsError} />
            </div>
          ) : null}
          {tab === 'drafts' && isOwn ? (
            <div role="tabpanel" id="panel-drafts" aria-labelledby="tab-drafts">
              <ProfileDraftsPanel />
            </div>
          ) : null}
          {tab === 'about' ? (
            <div role="tabpanel" id="panel-about" aria-labelledby="tab-about" className="flex flex-col gap-3 text-base text-ink">
              <p className="whitespace-pre-wrap">{profile.bio || 'No bio yet.'}</p>
              <p className="text-muted">Joined {joined}</p>
            </div>
          ) : null}
        </div>
      </div>
    </PageContainer>
  )
}
