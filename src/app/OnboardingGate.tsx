import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow.tsx'
import { EntranceScreen } from '../components/entrance/EntranceScreen.tsx'
import { fetchMyProfilePreferences, type ProfilePreferencesRow } from '../lib/onboarding/api.ts'
import { onboardingNeedsFlow } from '../lib/onboarding/stepMachine.ts'
import { useAuth } from '../lib/auth/auth-context.ts'
import { PageSkeleton } from '../components/states/Skeleton.tsx'

export function OnboardingGate() {
  const { isFounder } = useAuth()
  const [prefs, setPrefs] = useState<ProfilePreferencesRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [reopen, setReopen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await fetchMyProfilePreferences()
    setLoading(false)
    if (result.ok) setPrefs(result.data)
  }, [])

  useEffect(() => {
    if (isFounder) {
      setLoading(false)
      return
    }
    void refresh()
  }, [isFounder, refresh])

  useEffect(() => {
    function onReopen() {
      setReopen(true)
    }
    window.addEventListener('voxly-reopen-onboarding', onReopen)
    return () => window.removeEventListener('voxly-reopen-onboarding', onReopen)
  }, [])

  if (loading && !isFounder) return <PageSkeleton />

  const showOnboarding =
    !isFounder && prefs && (reopen || onboardingNeedsFlow(prefs.onboarding_completed_at, prefs.onboarding_step))

  return (
    <>
      {!isFounder && prefs ? (
        <EntranceScreen
          serverLastEntranceDate={prefs.last_entrance_local_date}
          showEntranceScreen={prefs.show_entrance_screen}
          firstEntranceEver={!prefs.welcome_moment_seen_at && !prefs.last_entrance_local_date}
          onFinished={() => void refresh()}
        />
      ) : null}
      {showOnboarding ? (
        <OnboardingFlow
          forceOpen={reopen}
          onFinished={() => {
            setReopen(false)
            void refresh()
          }}
          onCloseForced={() => setReopen(false)}
        />
      ) : null}
      <Outlet />
    </>
  )
}
