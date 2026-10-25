import { useEffect, useState } from 'react'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FollowButton } from '../components/profile/FollowButton.tsx'
import { MissingProfile } from '../components/profile/MissingProfile.tsx'
import { VerifiedSeal } from '../components/profile/VerifiedSeal.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'
import { PageSkeleton } from '../components/states/Skeleton.tsx'
import { getProfileByUsername, listFollowers, listFollowing } from '../lib/profiles/api.ts'
import type { FollowCursor } from '../lib/profiles/cursor.ts'
import type { FollowListEntry } from '../lib/profiles/types.ts'
import { CountryLink } from '../components/country/CountryLink.tsx'

type Ready = {
  key: string
  profileId: string
  username: string
  entries: FollowListEntry[]
  nextCursor: FollowCursor | null
}

export default function FollowListPage() {
  const { username = '' } = useParams()
  const location = useLocation()
  const list = location.pathname.endsWith('/following') ? 'following' : 'followers'
  const key = `${list}:${username.toLowerCase()}`
  const [attempt, setAttempt] = useState(0)
  const [ready, setReady] = useState<Ready | null>(null)
  const [problem, setProblem] = useState<{ key: string; missing: boolean; message: string } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const current = ready?.key === key ? ready : null
  const activeProblem = problem?.key === key ? problem : null
  const title = list === 'followers' ? 'Followers' : 'Following'

  useEffect(() => {
    let active = true
    void (async () => {
      const profile = await getProfileByUsername(username)
      if (!active) return
      if (!profile.ok) {
        setReady(null)
        setProblem({
          key,
          missing: profile.error.code === 'not_found',
          message: profile.error.message,
        })
        return
      }
      const page = list === 'followers' ? await listFollowers(profile.data.id, null) : await listFollowing(profile.data.id, null)
      if (!active) return
      if (!page.ok) {
        setReady(null)
        setProblem({ key, missing: false, message: page.error.message })
        return
      }
      setProblem(null)
      setMoreError('')
      setReady({
        key,
        profileId: profile.data.id,
        username: profile.data.username,
        entries: page.data.entries,
        nextCursor: page.data.nextCursor,
      })
    })()
    return () => {
      active = false
    }
  }, [key, list, username, attempt])

  async function loadMore() {
    if (!current?.nextCursor || loadingMore) return
    setLoadingMore(true)
    setMoreError('')
    const page =
      list === 'followers'
        ? await listFollowers(current.profileId, current.nextCursor)
        : await listFollowing(current.profileId, current.nextCursor)
    setLoadingMore(false)
    if (!page.ok) {
      setMoreError(page.error.message)
      return
    }
    setReady((existing) => {
      if (!existing || existing.key !== key) return existing
      return {
        ...existing,
        entries: [...existing.entries, ...page.data.entries],
        nextCursor: page.data.nextCursor,
      }
    })
  }

  if (activeProblem?.missing) return <MissingProfile />
  if (!current && activeProblem) {
    return (
      <ErrorState
        title={`${title} did not load`}
        message={activeProblem.message}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    )
  }
  if (!current) return <PageSkeleton />

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title={title} />
      <p className="text-sm text-muted">@{current.username}</p>
      {current.entries.length === 0 ? (
        <EmptyState
          title={list === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          message={
            list === 'followers'
              ? 'When people follow this account, they show up here.'
              : 'Accounts followed by this person show up here.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {current.entries.map((entry) => {
            const name = entry.profile.displayName || entry.profile.username
            return (
              <li key={entry.profile.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <Link to={`/u/${entry.profile.username}`} className={`rounded-full ${focusRing}`}>
                  <ImageWithFallback src={entry.profile.avatarUrl ?? undefined} alt="" label={name} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="inline-flex max-w-full min-w-0 items-center gap-x-1">
                    <Link to={`/u/${entry.profile.username}`} className={`inline-flex min-h-11 min-w-0 items-center ${focusRing}`}>
                      <span className="truncate font-serif text-xl text-ink">{name}</span>
                    </Link>
                    {entry.profile.verified ? <VerifiedSeal size="sm" /> : null}
                  </div>
                  <p className="truncate text-sm text-muted">@{entry.profile.username}</p>
                  {entry.profile.country ? (
                    <CountryLink code={entry.profile.country} testId="follow-list-country-link" />
                  ) : null}
                </div>
                {entry.isSelf ? null : (
                  <FollowButton
                    userId={entry.profile.id}
                    username={entry.profile.username}
                    following={entry.following}
                    onChange={(next) => {
                      setReady((existing) => {
                        if (!existing) return existing
                        return {
                          ...existing,
                          entries: existing.entries.map((item) =>
                            item.profile.id === entry.profile.id ? { ...item, following: next } : item,
                          ),
                        }
                      })
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      {moreError ? (
        <p role="alert" aria-live="polite" className="text-sm text-coral">
          {moreError}
        </p>
      ) : null}
      {current.nextCursor ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          className={`inline-flex min-h-11 items-center self-start rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink disabled:opacity-60 ${focusRing}`}
        >
          {loadingMore ? 'Loading…' : moreError ? 'Retry' : 'Load more'}
        </button>
      ) : null}
    </PageContainer>
  )
}
