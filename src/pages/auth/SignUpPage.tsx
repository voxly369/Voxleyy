import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { PasswordField } from '../../components/auth/PasswordField.tsx'
import { SubmitButton } from '../../components/auth/SubmitButton.tsx'
import { TextField } from '../../components/auth/TextField.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { SIGNUP_FAILED } from '../../lib/auth/messages.ts'
import { PasswordChecklist } from '../../components/auth/PasswordChecklist.tsx'
import { fieldErrors, signUpSchema } from '../../lib/auth/schemas.ts'
import { useUsernameAvailability } from '../../lib/auth/useUsernameAvailability.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

function availabilityMessage(state: ReturnType<typeof useUsernameAvailability>): string {
  if (state === 'checking') return 'Checking that username…'
  if (state === 'available') return 'That username is available.'
  if (state === 'taken') return 'That username is not available.'
  if (state === 'unknown') return 'We could not check that username just now.'
  return ''
}

export default function SignUpPage() {
  useDocumentTitle('Sign up')
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const lock = useRef(false)
  const availability = useUsernameAvailability(username)
  const availabilityText = availabilityMessage(availability)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const parsed = signUpSchema.safeParse({
      email: email.trim(),
      username: username.trim(),
      password,
      confirmPassword,
      acceptedTerms,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setFormError('')
      return
    }
    if (availability === 'taken') {
      setErrors((current) => ({ ...current, username: 'That username is not available.' }))
      return
    }
    if (availability === 'checking') return
    setErrors({})
    setFormError('')
    lock.current = true
    setPending(true)
    const result = await signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      username: parsed.data.username,
    })
    setPending(false)
    lock.current = false
    if (!result.ok) {
      setFormError(result.message ?? SIGNUP_FAILED)
      return
    }
    navigate('/check-email', { state: { email: parsed.data.email } })
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate>
      <h1 className="text-3xl text-ink">Create your account</h1>
      <TextField
        id="signup-email"
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
      <TextField
        id="signup-username"
        name="username"
        label="Username"
        type="text"
        inputMode="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={username}
        onChange={(event) => setUsername(event.target.value.toLowerCase())}
        error={errors.username}
        hint={availabilityText || '3 to 30 lowercase letters, numbers, or underscores.'}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {availabilityText}
      </p>
      <PasswordField
        id="signup-password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <PasswordChecklist password={password} />
      <PasswordField
        id="signup-confirm"
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
      />
      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 items-start gap-3 text-sm text-ink" htmlFor="signup-terms">
          <input
            id="signup-terms"
            name="terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className={`mt-1 size-5 accent-coral ${focusRing}`}
          />
          <span>
            I accept the{' '}
            <Link to="/terms" className={`underline underline-offset-2 ${focusRing}`}>
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className={`underline underline-offset-2 ${focusRing}`}>
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptedTerms ? (
          <p role="alert" aria-live="polite" className="text-sm text-coral">
            {errors.acceptedTerms}
          </p>
        ) : null}
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
        {formError}
      </p>
      <SubmitButton pending={pending} disabled={availability === 'checking' || availability === 'taken'}>
        Create account
      </SubmitButton>
      <p className="text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className={`font-medium text-ink underline underline-offset-2 ${focusRing}`}>
          Sign in
        </Link>
      </p>
    </form>
  )
}
