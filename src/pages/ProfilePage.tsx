import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProfileHeader } from '../components/profile/ProfileHeader.tsx'
import { MissingProfile } from '../components/profile/MissingProfile.tsx'
import { WorkCard } from '../components/creations/WorkCard.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { listUserPublished } from '../lib/creations/api.ts'
import type { PublishedCursor } from '../lib/creations/publishedCursor.ts'
import type { PublishedWorkSummary } from '../lib/creations/types.ts'
import { getProfileByUsername, isFollowing } from '../lib/profiles/api.ts'
import type { PublicProfile } from '../lib/profiles/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

type Tab = 'works' | 'about'

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
  const { profile: me } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<View | null>(null)
  const [problem, setProblem] = useState<{ key: string; missing: boolean; message: string } | null>(null)
  const [tab, setTab] = useState<Tab>('works')
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
        works: works.data.works,
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
        works: [...existing.works, ...result.data.works],
        nextCursor: result.data.nextCursor,
      }
    })
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
  const isOwn = me?.id === profile.id

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
          {(
            [
              ['works', 'Works'],
              ['about', 'About'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`min-h-11 px-3 text-base ${tab === id ? 'border-b-2 border-coral font-semibold text-ink' : 'font-medium text-muted'} ${focusRing}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="pt-5">
          {tab === 'works' ? (
            <div role="tabpanel" id="panel-works" aria-labelledby="tab-works" className="flex flex-col gap-4">
              {isOwn ? (
                <Link to="/write/drafts" className={`text-base font-medium text-coral ${focusRing}`}>
                  My drafts
                </Link>
              ) : null}
              {current.works.length === 0 ? (
                <EmptyState title="No works yet" message="Published works appear here." />
              ) : (
                <>
                  <ul className="flex flex-col gap-3">
                    {current.works.map((work) => (
                      <li key={work.id}>
                        <WorkCard work={work} variant="published" showAudience={isOwn} />
                      </li>
                    ))}
                  </ul>
                  {loadMoreError ? (
                    <ErrorState title="Could not load more" message={loadMoreError} onRetry={() => void loadMore()} />
                  ) : null}
                  {current.nextCursor ? (
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={() => void loadMore()}
                      className={`min-h-11 self-center rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div role="tabpanel" id="panel-about" aria-labelledby="tab-about" className="flex flex-col gap-3 text-base text-ink">
              <p className="whitespace-pre-wrap">{profile.bio || 'No bio yet.'}</p>
              <p className="text-muted">Joined {joined}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
