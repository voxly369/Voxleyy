import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProfileHeader } from '../components/profile/ProfileHeader.tsx'
import { MissingProfile } from '../components/profile/MissingProfile.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { getProfileByUsername, isFollowing } from '../lib/profiles/api.ts'
import type { PublicProfile } from '../lib/profiles/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

type Tab = 'works' | 'about'

type View = {
  key: string
  profile: PublicProfile
  following: boolean
  followerCount: number
}

export default function ProfilePage() {
  const { username = '' } = useParams()
  const { profile: me } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<View | null>(null)
  const [problem, setProblem] = useState<{ key: string; missing: boolean; message: string } | null>(null)
  const [tab, setTab] = useState<Tab>('works')
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
      setProblem(null)
      setView({
        key,
        profile: result.data,
        following: follow.data,
        followerCount: result.data.followerCount,
      })
    })()
    return () => {
      active = false
    }
  }, [key, attempt, me?.id])

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8">
      <ProfileHeader
        profile={profile}
        isOwn={me?.id === profile.id}
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
            <div role="tabpanel" id="panel-works" aria-labelledby="tab-works">
              <EmptyState title="No works yet" message="Works appear here once writing is added." />
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
