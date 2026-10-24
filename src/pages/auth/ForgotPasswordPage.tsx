import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { SubmitButton } from '../../components/auth/SubmitButton.tsx'
import { TextField } from '../../components/auth/TextField.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { RATE_LIMITED, RESET_SENT, SEND_FAILED } from '../../lib/auth/messages.ts'
import { fieldErrors, forgotPasswordSchema } from '../../lib/auth/schemas.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const lock = useRef(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (cooldownUntil === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  const cooldownRemaining =
    cooldownUntil === null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const coolingDown = cooldownRemaining > 0

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || coolingDown) return
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setFormError('')
      setSent(false)
      return
    }
    setErrors({})
    setFormError('')
    lock.current = true
    setPending(true)
    const result = await resetPassword(parsed.data.email)
    setPending(false)
    lock.current = false
    if (!result.ok) {
      setSent(false)
      const message = result.message ?? SEND_FAILED
      setFormError(message)
      if (message === RATE_LIMITED) {
        setCooldownUntil(Date.now() + 60_000)
        setNow(Date.now())
      }
      return
    }
    setSent(true)
    setCooldownUntil(Date.now() + 60_000)
    setNow(Date.now())
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate>
      <h1 className="text-3xl text-ink">Forgot password</h1>
      <p className="text-sm text-muted">We will email reset instructions if an account uses this address.</p>
      <TextField
        id="forgot-email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      {sent ? (
        <p role="status" aria-live="polite" className="text-sm text-ink">
          {RESET_SENT}
        </p>
      ) : null}
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
        {coolingDown && !sent ? `Try again in ${cooldownRemaining} seconds.` : formError}
      </p>
      <SubmitButton pending={pending} disabled={coolingDown}>
        {coolingDown ? `Wait ${cooldownRemaining}s` : 'Send instructions'}
      </SubmitButton>
      <p className="text-sm text-muted">
        <Link to="/login" className={`underline underline-offset-2 ${focusRing}`}>
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
