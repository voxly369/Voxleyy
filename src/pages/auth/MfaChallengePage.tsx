import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { MfaChallengeScreen } from '../../components/auth/MfaChallengeScreen.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { safeNextPath } from '../../lib/auth/safeNextPath.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'
import { PageSkeleton } from '../../components/states/Skeleton.tsx'
import { useEffect, useState } from 'react'
import { fetchMfaAssurance } from '../../lib/auth/mfa/assurance.ts'

export default function MfaChallengePage() {
  useDocumentTitle('Two-factor check')
  const { session, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const nextPath = safeNextPath(params.get('next'))
  const [needsChallenge, setNeedsChallenge] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) {
      setNeedsChallenge(null)
      return
    }
    let cancelled = false
    void fetchMfaAssurance().then((assurance) => {
      if (!cancelled) setNeedsChallenge(assurance.needsChallenge)
    })
    return () => {
      cancelled = true
    }
  }, [session])

  if (loading || (session && needsChallenge === null)) return <PageSkeleton />

  if (!session) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'
    return <Navigate to={target} replace />
  }

  if (!needsChallenge) {
    return <Navigate to={nextPath ?? '/'} replace />
  }

  return (
    <MfaChallengeScreen
      onSuccess={() => navigate(nextPath ?? '/', { replace: true })}
      onCancelSignOut={() => void signOut()}
    />
  )
}
