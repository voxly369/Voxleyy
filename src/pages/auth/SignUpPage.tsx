import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { PasswordField } from '../../components/auth/PasswordField.tsx'
import { SubmitButton } from '../../components/auth/SubmitButton.tsx'
import { TextField } from '../../components/auth/TextField.tsx'
import { CountryPicker } from '../../components/auth/CountryPicker.tsx'
import { SignatureQuote } from '../../components/auth/SignatureQuote.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { RATE_LIMITED, SIGNUP_FAILED } from '../../lib/auth/messages.ts'
import { mapAuthError } from '../../lib/errors/mapAuthError.ts'
import { PasswordChecklist } from '../../components/auth/PasswordChecklist.tsx'
import { fieldErrors, signUpSchema } from '../../lib/auth/schemas.ts'
import { useUsernameAvailability } from '../../lib/auth/useUsernameAvailability.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'
import {
  fetchBetaSignupConfig,
  joinBetaWaitlist,
  checkInviteCodeValid,
  type BetaSignupConfig,
} from '../../lib/beta/signupConfig.ts'
import { isFounderSignupEmail } from '../../lib/beta/founderSignup.ts'
import { normalizeInviteCode } from '../../lib/beta/inviteCode.ts'
import { LEGAL_DOCUMENT_VERSIONS } from '../../config/organization.ts'
import { recordUserConsents } from '../../lib/consent/recordConsent.ts'
import { defaultSignupCountryAndZone } from '../../lib/signup/countryPrefill.ts'

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
  const [searchParams] = useSearchParams()
  const joinBanner = searchParams.get('from') === 'join'
  const linkedCode = searchParams.get('code') ?? ''
  const [betaConfig, setBetaConfig] = useState<BetaSignupConfig | null>(null)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLocked, setInviteLocked] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmedAge, setConfirmedAge] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState(false)
  const [waitlistPending, setWaitlistPending] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)
  const lock = useRef(false)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const defaults = defaultSignupCountryAndZone()
    setTimezone(defaults.timezone)
    if (defaults.country) setCountry(defaults.country)
  }, [])

  useEffect(() => {
    if (!linkedCode) return
    try {
      setInviteCode(normalizeInviteCode(linkedCode))
      setInviteLocked(true)
    } catch {
      setInviteCode(linkedCode.trim())
      setInviteLocked(Boolean(linkedCode.trim()))
    }
  }, [linkedCode])

  useEffect(() => {
    if (cooldownUntil === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  const cooldownRemaining =
    cooldownUntil === null ? 0 : Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const coolingDown = cooldownRemaining > 0
  const availability = useUsernameAvailability(username)
  const availabilityText = availabilityMessage(availability)

  useEffect(() => {
    void fetchBetaSignupConfig().then(setBetaConfig)
  }, [])

  const inviteRequired = betaConfig?.invite_only === true
  const signupsOpen = betaConfig?.signups_open !== false
  const founderSignup = isFounderSignupEmail(email)
  const showSignupForm = signupsOpen || founderSignup
  const waitlistOpen = betaConfig?.waitlist_open === true && !signupsOpen && !founderSignup
  const inviteRequiredForUser = inviteRequired && !founderSignup

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !showSignupForm || coolingDown) return
    const parsed = signUpSchema.safeParse({
      email: email.trim(),
      displayName: displayName.trim(),
      username: username.trim(),
      country: country.trim().toUpperCase(),
      timezone: timezone.trim(),
      password,
      confirmPassword,
      acceptedTerms,
      confirmedAge,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setFormError('')
      return
    }
    if (inviteRequiredForUser && !inviteCode.trim()) {
      setErrors((current) => ({ ...current, inviteCode: 'Enter your beta invite code.' }))
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

    let normalizedInvite: string | undefined
    if (inviteRequiredForUser) {
      const checked = await checkInviteCodeValid(inviteCode)
      if (!checked.ok) {
        setPending(false)
        lock.current = false
        setFormError(checked.message)
        return
      }
      normalizedInvite = normalizeInviteCode(inviteCode)
    }

    const result = await signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
      inviteCode: normalizedInvite,
    })
    if (!result.ok) {
      setPending(false)
      lock.current = false
      const mapped = result.message ?? mapAuthError({ message: result.message }, SIGNUP_FAILED)
      setFormError(mapped)
      if (mapped === RATE_LIMITED) {
        setCooldownUntil(Date.now() + 60_000)
        setNow(Date.now())
      }
      return
    }
    await recordUserConsents([
      { document: 'terms', version: LEGAL_DOCUMENT_VERSIONS.terms },
      { document: 'privacy', version: LEGAL_DOCUMENT_VERSIONS.privacy },
      { document: 'age_18', version: LEGAL_DOCUMENT_VERSIONS.age_18 },
    ])
    setPending(false)
    lock.current = false
    navigate('/check-email', { state: { email: parsed.data.email } })
  }

  async function onWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!waitlistOpen || waitlistPending) return
    const trimmed = email.trim()
    if (!trimmed) {
      setErrors({ email: 'Enter your email for the waitlist.' })
      return
    }
    setWaitlistPending(true)
    setFormError('')
    const result = await joinBetaWaitlist(trimmed)
    setWaitlistPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setWaitlistDone(true)
  }

  if (betaConfig === null) {
    return (
      <p className="text-sm text-muted" data-testid="signup-config-loading">
        Loading sign-up options…
      </p>
    )
  }

  if (!showSignupForm) {
    return (
      <div className="flex flex-col gap-5" data-testid="signup-closed">
        <h1 className="text-3xl text-ink">Sign-ups are closed</h1>
        <p className="text-base text-muted">
          {betaConfig.closed_message ??
            'Voxly is in a closed beta. We are not accepting new accounts right now.'}
        </p>
        {waitlistOpen ? (
          waitlistDone ? (
            <p role="status" className="text-sm text-ink" data-testid="signup-waitlist-done">
              You are on the waitlist. We will email you when a spot opens.
            </p>
          ) : (
            <form onSubmit={(event) => void onWaitlist(event)} className="flex flex-col gap-4" noValidate>
              <TextField
                id="waitlist-email"
                name="email"
                label="Email for waitlist"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
              />
              <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
                {formError}
              </p>
              <SubmitButton pending={waitlistPending} data-testid="signup-waitlist-submit">
                Join waitlist
              </SubmitButton>
            </form>
          )
        ) : null}
        <p className="text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className={`font-medium text-ink underline underline-offset-2 ${focusRing}`}>
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate data-testid="signup-form">
      <h1 className="text-3xl text-ink">Create your account</h1>
      <SignatureQuote />
      {joinBanner ? (
        <p role="status" className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink" data-testid="signup-invite-banner">
          You&apos;ve been invited to Voxly.
        </p>
      ) : null}
      {inviteRequiredForUser ? (
        <p className="text-sm text-muted" data-testid="signup-closed-beta-note">
          Voxly is in invite-only beta. You need a code from the team to register.
        </p>
      ) : null}
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
        id="signup-display-name"
        name="displayName"
        label="Display name"
        type="text"
        autoComplete="name"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        error={errors.displayName}
        hint="1 to 50 characters. This is how you appear across Voxly."
      />
      {inviteRequiredForUser ? (
        <div className="flex flex-col gap-2">
          <TextField
            id="signup-invite"
            name="inviteCode"
            label="Invite code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            error={errors.inviteCode}
            data-testid="signup-invite-code"
            readOnly={inviteLocked}
          />
          {inviteLocked ? (
            <button
              type="button"
              className={`self-start text-sm text-coral underline underline-offset-2 ${focusRing}`}
              onClick={() => setInviteLocked(false)}
              data-testid="signup-invite-unlock"
            >
              Enter a different code
            </button>
          ) : null}
        </div>
      ) : null}
      <CountryPicker
        id="signup-country"
        label="Country"
        value={country}
        onChange={setCountry}
        error={errors.country}
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
        <label className="flex min-h-11 items-start gap-3 text-sm text-ink" htmlFor="signup-age">
          <input
            id="signup-age"
            name="age"
            type="checkbox"
            checked={confirmedAge}
            onChange={(event) => setConfirmedAge(event.target.checked)}
            className={`mt-1 size-5 accent-coral ${focusRing}`}
            data-testid="signup-age-consent"
          />
          <span>I am 18 or older.</span>
        </label>
        {errors.confirmedAge ? (
          <p role="alert" className="text-sm text-coral">
            {errors.confirmedAge}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex min-h-11 items-start gap-3 text-sm text-ink" htmlFor="signup-terms">
          <input
            id="signup-terms"
            name="terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className={`mt-1 size-5 accent-coral ${focusRing}`}
            data-testid="signup-consent"
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
        {coolingDown ? `Try again in ${cooldownRemaining} seconds.` : formError}
      </p>
      <SubmitButton
        pending={pending}
        disabled={coolingDown || availability === 'checking' || availability === 'taken'}
      >
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
