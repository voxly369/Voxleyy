import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { PasswordField } from '../../components/auth/PasswordField.tsx'
import { SubmitButton } from '../../components/auth/SubmitButton.tsx'
import { TextField } from '../../components/auth/TextField.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { LOGIN_FAILED, SESSION_ENDED } from '../../lib/auth/messages.ts'
import { safeNextPath } from '../../lib/auth/safeNextPath.ts'
import { fieldErrors, loginSchema } from '../../lib/auth/schemas.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

const FAILURE_LIMIT = 5
const COOLDOWN_MS = 30_000

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const { signIn, sessionNotice } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const nextPath = safeNextPath(params.get('next'))
  const sessionEnded = sessionNotice || params.get('notice') === 'session'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const [failures, setFailures] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lock = useRef(false)

  useEffect(() => {
    if (cooldownUntil === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  const remaining =
    cooldownUntil === null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const cooling = remaining > 0

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || cooling) return
    const parsed = loginSchema.safeParse({ email: email.trim(), password })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setFormError('')
      return
    }
    setErrors({})
    setFormError('')
    lock.current = true
    setPending(true)
    const result = await signIn(parsed.data.email, parsed.data.password)
    setPending(false)
    lock.current = false
    if (!result.ok) {
      const nextFailures = failures + 1
      if (nextFailures >= FAILURE_LIMIT) {
        setFailures(0)
        setCooldownUntil(Date.now() + COOLDOWN_MS)
        setNow(Date.now())
      } else {
        setFailures(nextFailures)
      }
      setFormError(LOGIN_FAILED)
      return
    }
    setFailures(0)
    setCooldownUntil(null)
    navigate(nextPath ?? '/', { replace: true })
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate>
      <h1 className="text-3xl text-ink">Sign in</h1>
      {sessionEnded ? (
        <p role="status" aria-live="polite" className="text-sm text-ink">
          {SESSION_ENDED}
        </p>
      ) : null}
      <TextField
        id="login-email"
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
      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
        {cooling ? `Try again in ${remaining} seconds.` : formError}
      </p>
      <SubmitButton pending={pending} disabled={cooling}>
        Sign in
      </SubmitButton>
      <p className="text-sm text-muted">
        <Link to="/forgot-password" className={`underline underline-offset-2 ${focusRing}`}>
          Forgot password
        </Link>
      </p>
      <p className="text-sm text-muted">
        New to Voxly?{' '}
        <Link to="/signup" className={`font-medium text-ink underline underline-offset-2 ${focusRing}`}>
          Create an account
        </Link>
      </p>
    </form>
  )
}
