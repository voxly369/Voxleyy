import { useEffect, useState, type KeyboardEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ProfileHeader } from '../components/profile/ProfileHeader.tsx'
import { ProfileDraftsPanel } from '../components/profile/ProfileDraftsPanel.tsx'
import { ProfilePostsGrid } from '../components/profile/ProfilePostsGrid.tsx'
import { MissingProfile } from '../components/profile/MissingProfile.tsx'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { useAuth } from '../lib/auth/auth-context.ts'
import { listUserPublished } from '../lib/creations/api.ts'
import { worksForPostsGrid } from '../lib/creations/profilePostsMapper.ts'
import type { PublishedCursor } from '../lib/creations/publishedCursor.ts'
import type { PublishedWorkSummary } from '../lib/creations/types.ts'
import { getProfileByUsername, isFollowing } from '../lib/profiles/api.ts'
import type { PublicProfile } from '../lib/profiles/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

type Tab = 'posts' | 'drafts' | 'about'

type View = {
  key: string
  profile: PublicProfile
  following: boolean
  followerCount: number
  works: PublishedWorkSummary[]
  nextCursor: PublishedCursor | null
}

export default function ProfilePage() {
  const { username = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { profile: me } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<View | null>(null)
  const [problem, setProblem] = useState<{ key: string; missing: boolean; message: string } | null>(null)
  const initialTab: Tab = searchParams.get('tab') === 'drafts' ? 'drafts' : 'posts'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const key = username.toLowerCase()
  const current = view?.key === key ? view : null
  const activeProblem = problem?.key === key ? problem : null

  useDocumentTitle(current ? current.profile.displayName || current.profile.username : 'Profile')

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
  }, [key, attempt, me?.id])

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

  const tabs: { id: Tab; label: string; ownOnly?: boolean }[] = [
    { id: 'posts', label: 'Posts' },
    { id: 'drafts', label: 'Drafts', ownOnly: true },
    { id: 'about', label: 'About' },
  ]

  const isOwnProfile = me?.id === current?.profile.id

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, _index: number) {
    const visible = tabs.filter((t) => !t.ownOnly || isOwnProfile)
    const currentIndex = visible.findIndex((t) => t.id === tab)
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setTab(visible[(currentIndex + 1) % visible.length].id)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setTab(visible[(currentIndex - 1 + visible.length) % visible.length].id)
    }
  }

  if (!current && !activeProblem) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <Skeleton />
        <Skeleton variant="circle" />
        <Skeleton variant="text-lines" lines={4} />
      </div>
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
  const visibleTabs = tabs.filter((t) => !t.ownOnly || isOwn)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8">
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
      />
      <div className="px-5">
        <div role="tablist" aria-label="Profile" className="flex gap-2 border-b border-line">
          {visibleTabs.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              onClick={() => setTab(item.id)}
              className={`min-h-11 px-3 text-base ${tab === item.id ? 'border-b-2 border-coral font-semibold text-ink' : 'font-medium text-muted'} ${focusRing}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="pt-5">
          {tab === 'posts' ? (
            <div role="tabpanel" id="panel-posts" aria-labelledby="tab-posts">
              {current.works.length === 0 ? (
                <EmptyState title="No posts yet" message="Published public work appears here." />
              ) : (
                <ProfilePostsGrid
                  works={current.works}
                  viewerId={me?.id ?? null}
                  profileUserId={profile.id}
                  onLoadMore={() => void loadMore()}
                  loadingMore={loadingMore}
                  hasMore={Boolean(current.nextCursor)}
                  loadMoreError={loadMoreError}
                  onRetryLoadMore={() => void loadMore()}
                />
              )}
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
    </div>
  )
}
