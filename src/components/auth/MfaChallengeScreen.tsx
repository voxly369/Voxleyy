import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { SubmitButton } from './SubmitButton.tsx'
import { MfaCodeField } from './MfaCodeField.tsx'
import { verifySignInTotp } from '../../lib/auth/mfa/totp.ts'
import { MFA_LOST_DEVICE } from '../../lib/auth/mfa/messages.ts'

type MfaChallengeScreenProps = {
  onSuccess: () => void
  onCancelSignOut: () => void
}

export function MfaChallengeScreen({ onSuccess, onCancelSignOut }: MfaChallengeScreenProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || code.length !== 6) return
    setPending(true)
    setError('')
    const result = await verifySignInTotp(code)
    setPending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onSuccess()
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-5"
      noValidate
      data-testid="mfa-challenge-screen"
    >
      <h1 className="text-3xl text-ink">Two-factor check</h1>
      <p className="text-sm text-muted">
        Enter the six-digit code from your authenticator app to finish signing in.
      </p>
      <MfaCodeField id="mfa-challenge-code" value={code} onChange={setCode} error={error} disabled={pending} />
      <SubmitButton pending={pending} disabled={code.length !== 6}>
        Continue
      </SubmitButton>
      <p className="text-sm text-muted">{MFA_LOST_DEVICE}</p>
      <button
        type="button"
        onClick={() => void onCancelSignOut()}
        className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-line px-5 text-base font-semibold text-ink ${focusRing}`}
        data-testid="mfa-challenge-sign-out"
      >
        Sign out
      </button>
      <p className="text-sm text-muted">
        <Link to="/contact" className={`underline underline-offset-2 ${focusRing}`}>
          Contact support
        </Link>
      </p>
    </form>
  )
}
