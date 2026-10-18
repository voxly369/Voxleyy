import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../../components/shell/navItems.ts'
import { PasswordField } from '../../components/auth/PasswordField.tsx'
import { SubmitButton } from '../../components/auth/SubmitButton.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { PASSWORD_SAVE_FAILED } from '../../lib/auth/messages.ts'
import { passwordStrengthHint } from '../../lib/auth/passwords.ts'
import { fieldErrors, resetPasswordSchema } from '../../lib/auth/schemas.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function ResetPasswordPage() {
  useDocumentTitle('Reset password')
  const { session, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const lock = useRef(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setFormError('')
      return
    }
    setErrors({})
    setFormError('')
    lock.current = true
    setPending(true)
    const result = await updatePassword(parsed.data.password)
    setPending(false)
    lock.current = false
    if (!result.ok) {
      setFormError(PASSWORD_SAVE_FAILED)
      return
    }
    setSaved(true)
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl text-ink">Reset password</h1>
        <p role="alert" aria-live="polite" className="text-sm text-ink">
          This link has expired. Request a new one.
        </p>
        <Link
          to="/forgot-password"
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
        >
          Request a new link
        </Link>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl text-ink">Password saved</h1>
        <p role="status" aria-live="polite" className="text-sm text-ink">
          Your password is updated. You can continue into Voxly.
        </p>
        <Link
          to="/"
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
        >
          Continue
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate>
      <h1 className="text-3xl text-ink">Choose a new password</h1>
      <PasswordField
        id="reset-password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        hint={passwordStrengthHint(password)}
      />
      <PasswordField
        id="reset-confirm"
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
      />
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-coral">
        {formError}
      </p>
      <SubmitButton pending={pending}>Save password</SubmitButton>
    </form>
  )
}
