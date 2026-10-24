import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { SEND_FAILED } from '../../lib/auth/messages.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'
import { maskEmailForDisplay } from '../../lib/signup/maskEmail.ts'
import { canResendConfirmation, recordResendConfirmation } from '../../lib/signup/resendLimits.ts'

const COOLDOWN_SECONDS = 60

function emailFromState(state: unknown): string {
  if (!state || typeof state !== 'object' || !('email' in state)) return ''
  const email = (state as { email?: unknown }).email
  return typeof email === 'string' ? email : ''
}

export default function CheckEmailPage() {
  useDocumentTitle('Check your email')
  const { resendConfirmation } = useAuth()
  const location = useLocation()
  const email = emailFromState(location.state)
  const masked = email ? maskEmailForDisplay(email) : ''
  const [seconds, setSeconds] = useState(0)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  async function resend() {
    if (lock.current || seconds > 0 || !email) return
    if (!canResendConfirmation()) {
      setError('You have reached the resend limit for this hour. Try again later.')
      return
    }
    lock.current = true
    setPending(true)
    setError('')
    setNotice('')
    const result = await resendConfirmation(email)
    setPending(false)
    lock.current = false
    if (!result.ok) {
      setError(result.message ?? SEND_FAILED)
      return
    }
    recordResendConfirmation()
    setNotice('We sent another link.')
    setSeconds(COOLDOWN_SECONDS)
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl text-ink">Check your email</h1>
      <p role="status" aria-live="polite" className="text-base text-ink">
        {masked
          ? `We sent a confirmation link to ${masked}. Open it when you are ready.`
          : 'We sent a confirmation link to your email address.'}
      </p>
      <p className="text-sm text-muted">The link expires after a while. You can request a new one below.</p>
      {notice ? (
        <p role="status" aria-live="polite" className="text-sm text-ink">
          {notice}
        </p>
      ) : null}
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
        {error}
      </p>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={pending || seconds > 0 || !email}
        aria-busy={pending ? true : undefined}
        className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
        data-testid="check-email-resend"
      >
        {seconds > 0 ? `Resend in ${seconds}s` : pending ? 'Please wait…' : 'Resend link'}
      </button>
      <p className="text-sm text-muted">
        <Link to="/signup" className={`underline underline-offset-2 ${focusRing}`} data-testid="check-email-start-over">
          Wrong email? Start over
        </Link>
      </p>
      <p className="text-sm text-muted">
        <Link to="/login" className={`underline underline-offset-2 ${focusRing}`}>
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
