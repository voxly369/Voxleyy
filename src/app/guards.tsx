import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { focusRing } from '../components/shell/navItems.ts'
import { ConsentReacceptModal } from '../components/consent/ConsentReacceptModal.tsx'
import { PageSkeleton } from '../components/states/Skeleton.tsx'
import { AccountStatusPage } from '../pages/auth/AccountStatusPage.tsx'
import InviteGatePage from '../pages/auth/InviteGatePage.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { safeNextPath } from '../lib/auth/safeNextPath.ts'
import { isBannedStatus } from '../lib/auth/profile.ts'
import { documentsNeedingReaccept, parseStoredConsents } from '../lib/consent/consentVersion.ts'
import type { LegalDocumentKey } from '../config/organization.ts'
import { supabase } from '../lib/supabaseClient.ts'

function pathAllowedDuringInviteGate(pathname: string): boolean {
  return /^\/(settings|terms|privacy|contact|copyright|community-guidelines)(\/|$)/.test(pathname)
}

function ConsentReacceptGate() {
  const { session, profile, isFounder } = useAuth()
  const location = useLocation()
  const [pendingDocs, setPendingDocs] = useState<LegalDocumentKey[] | null>(null)

  useEffect(() => {
    if (!session?.user.id || isFounder) {
      setPendingDocs([])
      return
    }
    let cancelled = false
    void supabase.rpc('get_my_consents').then(({ data }) => {
      if (cancelled) return
      const records = parseStoredConsents(data)
      setPendingDocs(documentsNeedingReaccept(records))
    })
    return () => {
      cancelled = true
    }
  }, [session?.user.id, isFounder, profile?.updated_at])

  if (pendingDocs === null) return <PageSkeleton />

  const allowedPath = pathAllowedDuringInviteGate(location.pathname)
  const needsReaccept = pendingDocs.length > 0

  if (needsReaccept && !allowedPath) {
    return (
      <ConsentReacceptModal
        open
        documents={pendingDocs}
        onAccepted={() => setPendingDocs([])}
      />
    )
  }

  return <Outlet />
}

export function RequireAuth() {
  const { session, profile, loading, error, refreshProfile, signOut, isFounder } = useAuth()
  const location = useLocation()
  const [inviteGate, setInviteGate] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session?.user.id) {
      setInviteGate(null)
      return
    }
    let cancelled = false
    void supabase.rpc('get_my_beta_status').then(({ data }) => {
      if (cancelled) return
      const row = data as { invite_only?: boolean; access_granted?: boolean } | null
      setInviteGate(Boolean(row?.invite_only) && !row?.access_granted)
    })
    return () => {
      cancelled = true
    }
  }, [session?.user.id, profile?.updated_at])

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

  if (!isFounder && inviteGate === null) return <PageSkeleton />

  if (!isFounder && inviteGate && !pathAllowedDuringInviteGate(location.pathname)) {
    return <InviteGatePage />
  }

  return <ConsentReacceptGate />
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

export function RequireWriter() {
  const { profile, loading } = useAuth()
  if (loading) return <PageSkeleton />
  if (!profile || profile.role !== 'writer') return <Navigate to="/" replace />
  return <Outlet />
}
