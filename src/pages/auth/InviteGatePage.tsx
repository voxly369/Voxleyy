import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { LegalDraftNotice } from '../../components/legal/LegalDraftNotice.tsx'
import { SubmitButton } from '../../components/auth/SubmitButton.tsx'
import { TextField } from '../../components/auth/TextField.tsx'
import { redeemInviteCode, joinBetaWaitlist, fetchBetaSignupConfig } from '../../lib/beta/signupConfig.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'
import { useEffect } from 'react'

export default function InviteGatePage() {
  useDocumentTitle('Invite code')
  const { signOut, refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [error, setError] = useState('')
  const [waitlistOk, setWaitlistOk] = useState(false)
  const [pending, setPending] = useState(false)
  const [config, setConfig] = useState<Awaited<ReturnType<typeof fetchBetaSignupConfig>> | null>(null)

  useEffect(() => {
    void fetchBetaSignupConfig().then(setConfig)
  }, [])

  async function onRedeem(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)
    const result = await redeemInviteCode(code)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    await refreshProfile()
  }

  async function onWaitlist(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)
    const result = await joinBetaWaitlist(waitlistEmail)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setWaitlistOk(true)
  }

  return (
    <main
      data-testid="invite-gate"
      className="flex min-h-screen flex-col items-center bg-bg px-5 py-10"
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <LegalDraftNotice />
        <h1 className="text-3xl text-ink">Voxly is in a closed beta</h1>
        <p className="text-base text-muted">
          Enter the invite code you received to unlock the app. You can still export your data, delete your account, or
          sign out below.
        </p>
        <form onSubmit={(e) => void onRedeem(e)} className="flex flex-col gap-4" noValidate>
          <TextField
            id="invite-code"
            label="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            data-testid="invite-gate-code"
          />
          {error ? (
            <p role="alert" className="text-base text-coral">
              {error}
            </p>
          ) : null}
          <SubmitButton pending={pending}>Unlock Voxly</SubmitButton>
        </form>
        {config?.waitlist_open ? (
          <form onSubmit={(e) => void onWaitlist(e)} className="flex flex-col gap-3 border-t border-line pt-6" noValidate>
            <h2 className="text-xl text-ink">Join the waitlist</h2>
            {waitlistOk ? (
              <p className="text-muted">You are on the waitlist. We will email you when a spot opens.</p>
            ) : (
              <>
                <TextField
                  id="waitlist-email"
                  label="Email"
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  data-testid="invite-gate-waitlist-email"
                />
                <SubmitButton pending={pending}>Join waitlist</SubmitButton>
              </>
            )}
          </form>
        ) : null}
        <nav className="flex flex-col gap-2 text-base" aria-label="Legal and account">
          <Link to="/terms" className={`text-coral underline ${focusRing}`}>
            Terms
          </Link>
          <Link to="/privacy" className={`text-coral underline ${focusRing}`}>
            Privacy
          </Link>
          <Link to="/settings" className={`text-coral underline ${focusRing}`}>
            Settings (export or delete account)
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className={`text-left text-ink underline ${focusRing}`}
          >
            Sign out
          </button>
        </nav>
      </div>
    </main>
  )
}
