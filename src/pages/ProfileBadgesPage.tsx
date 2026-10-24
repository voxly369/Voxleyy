import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeIcon } from '../components/badges/BadgeIcon.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import {
  badgeProgressForUser,
  listPinnedBadges,
  listUserBadgesPublic,
  pinBadge,
  unpinBadge,
} from '../lib/badges/api.ts'
import { mergeProgressWithMeta, sortBadgeProgress } from '../lib/badges/progress.ts'
import { MAX_PINNED_BADGES } from '../lib/badges/types.ts'
import { getProfileByUsername } from '../lib/profiles/api.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { useToast } from '../lib/shell/useToast.ts'

export default function ProfileBadgesPage() {
  const { username = '' } = useParams()
  const { profile: me } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ReturnType<typeof sortBadgeProgress>>([])
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([])
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useDocumentTitle(displayName ? `${displayName} badges` : 'Badges')

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      const profile = await getProfileByUsername(username)
      if (!active) return
      if (!profile.ok) {
        setError(profile.error.message)
        setLoading(false)
        return
      }
      setUserId(profile.data.id)
      setDisplayName(profile.data.displayName || profile.data.username)
      const [progressResult, earnedResult, pinnedResult] = await Promise.all([
        badgeProgressForUser(profile.data.id),
        listUserBadgesPublic(profile.data.id),
        listPinnedBadges(profile.data.id),
      ])
      if (!active) return
      if (!progressResult.ok) {
        setError(progressResult.error.message)
        setLoading(false)
        return
      }
      const earnedKeys = new Set(earnedResult.ok ? earnedResult.data.map((b) => b.badgeKey) : [])
      const merged = mergeProgressWithMeta(
        progressResult.data.map((row) => ({
          ...row,
          earned: row.earned || earnedKeys.has(row.key),
        })),
      )
      setProgress(sortBadgeProgress(merged))
      setPinnedKeys(pinnedResult.ok ? pinnedResult.data.map((row) => row.badgeKey) : [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [username])

  const isOwn = Boolean(me?.id && userId && me.id === userId)

  async function togglePin(badgeKey: string, earned: boolean) {
    if (!isOwn || !earned || badgeKey === 'founder') return
    setBusyKey(badgeKey)
    const pinned = pinnedKeys.includes(badgeKey)
    const result = pinned ? await unpinBadge(badgeKey) : await pinBadge(badgeKey)
    setBusyKey(null)
    if (!result.ok) {
      showToast(result.error.message)
      return
    }
    if (pinned) setPinnedKeys((keys) => keys.filter((key) => key !== badgeKey))
    else setPinnedKeys((keys) => [...keys, badgeKey])
  }

  if (loading) {
    return (
      <PageContainer variant="wide" className="flex flex-col gap-4 py-8">
        <Skeleton />
        <Skeleton variant="text-lines" lines={6} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer variant="wide" className="py-8">
        <ErrorState title="Badges did not load" message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <div data-testid="profile-badges-page" className="contents">
      <div className="flex flex-col gap-2 px-5">
        <Link to={`/u/${username}`} className={`text-sm font-medium text-coral ${focusRing}`}>
          ← Back to profile
        </Link>
        <h1 className="font-serif text-3xl text-ink">Badges</h1>
        <p className="text-sm text-muted">
          {isOwn ? `Pin up to ${MAX_PINNED_BADGES} badges on your profile.` : `Badges earned by ${displayName}.`}
        </p>
      </div>
      <ul className="flex flex-col gap-3 px-5">
        {progress.map((row) => (
          <li key={row.key} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <BadgeIcon badgeKey={row.key} iconKey={row.iconKey} size="md" />
                <div>
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-sm text-muted">{row.description}</p>
                </div>
              </div>
              {isOwn && row.earned ? (
                <button
                  type="button"
                  disabled={busyKey === row.key}
                  onClick={() => void togglePin(row.key, row.earned)}
                  className={`min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${pinnedKeys.includes(row.key) ? 'bg-coral text-white' : 'text-ink'} ${focusRing}`}
                  data-testid={`pin-badge-${row.key}`}
                >
                  {pinnedKeys.includes(row.key) ? 'Pinned' : 'Pin'}
                </button>
              ) : null}
            </div>
            {!row.earned ? (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-raised">
                  <div className="h-full bg-coral" style={{ width: `${row.percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {row.current} / {row.goal}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-coral">Earned</p>
            )}
          </li>
        ))}
      </ul>
      </div>
    </PageContainer>
  )
}
