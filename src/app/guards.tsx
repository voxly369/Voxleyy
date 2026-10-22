import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { focusRing } from '../components/shell/navItems.ts'
import { PageSkeleton } from '../components/states/Skeleton.tsx'
import { AccountStatusPage } from '../pages/auth/AccountStatusPage.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { safeNextPath } from '../lib/auth/safeNextPath.ts'
import { isBannedStatus } from '../lib/auth/profile.ts'

export function RequireAuth() {
  const { session, profile, loading, error, refreshProfile, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <PageSkeleton />

  if (!session) {
    const next = safeNextPath(`${location.pathname}${location.search}`)
    const target = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
    return <Navigate to={target} replace />
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
        <div className="flex w-full max-w-md flex-col gap-4">
          <h1 className="text-3xl text-ink">Account</h1>
          <p role="alert" aria-live="polite" className="text-base text-muted">
            {error ?? 'We could not load your account. Try again.'}
          </p>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-line px-5 text-base font-semibold text-ink ${focusRing}`}
          >
            Log out
          </button>
        </div>
      </main>
    )
  }

  if (isBannedStatus(profile.status)) return <AccountStatusPage />

  return <Outlet />
}

export function RequireGuest() {
  const { session, loading } = useAuth()
  if (loading) return <PageSkeleton />
  if (session) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireFounder() {
  const { isFounder, loading } = useAuth()
  if (loading) return <PageSkeleton />
  if (!isFounder) return <Navigate to="/" replace />
  return <Outlet />
}
