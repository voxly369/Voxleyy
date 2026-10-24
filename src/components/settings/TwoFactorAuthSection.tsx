import { useCallback, useEffect, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { MfaEnrollModal } from './MfaEnrollModal.tsx'
import { PasswordField } from '../auth/PasswordField.tsx'
import { Modal } from '../shell/Modal.tsx'
import { listTotpFactors, reauthenticateWithPassword, removeTotpFactor, type TotpFactor } from '../../lib/auth/mfa/totp.ts'
import { MFA_REAUTH_REQUIRED } from '../../lib/auth/mfa/messages.ts'

export function TwoFactorAuthSection() {
  const { session } = useAuth()
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeFactorId, setRemoveFactorId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const next = await listTotpFactors()
    setFactors(next.filter((f) => f.status === 'verified'))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const enabled = factors.length > 0

  function openRemove(factorId: string) {
    setRemoveFactorId(factorId)
    setPassword('')
    setError('')
    setRemoveOpen(true)
  }

  async function handleRemove() {
    if (!removeFactorId || busy) return
    const email = session?.user.email
    if (!email) {
      setError('Sign in again before changing two-factor authentication.')
      return
    }
    setBusy(true)
    setError('')
    const reauth = await reauthenticateWithPassword(email, password)
    if (!reauth.ok) {
      setBusy(false)
      setError(reauth.message)
      return
    }
    const removed = await removeTotpFactor(removeFactorId)
    setBusy(false)
    if (!removed.ok) {
      setError(removed.message)
      return
    }
    setRemoveOpen(false)
    void refresh()
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-two-factor">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Security</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-medium text-ink">Two-factor authentication</p>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? 'Checking status…'
              : enabled
                ? 'An authenticator app is required when you sign in.'
                : 'Optional. Add an authenticator app for an extra sign-in step.'}
          </p>
        </div>
        {enabled ? (
          <button
            type="button"
            onClick={() => openRemove(factors[0].id)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-2xl border border-line px-4 text-sm font-semibold text-ink ${focusRing}`}
            data-testid="mfa-remove-open"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => setEnrollOpen(true)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-2xl bg-raised px-4 text-sm font-semibold text-ink disabled:opacity-50 ${focusRing}`}
            data-testid="mfa-enroll-open"
          >
            Set up
          </button>
        )}
      </div>
      <MfaEnrollModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        onEnrolled={() => void refresh()}
      />
      <Modal
        open={removeOpen}
        onClose={() => {
          if (busy) return
          setRemoveOpen(false)
        }}
        closeOnEscape={!busy}
        role="alertdialog"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
      >
        <div data-testid="mfa-remove-modal">
          <h2 className="font-serif text-xl text-ink">Remove authenticator</h2>
          <p className="mt-3 text-sm text-muted">{MFA_REAUTH_REQUIRED}</p>
          <PasswordField
            id="mfa-remove-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          {error ? (
            <p role="alert" className="mt-3 text-sm text-coral">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setRemoveOpen(false)}
              className={`inline-flex min-h-11 items-center rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || password.length < 8}
              onClick={() => void handleRemove()}
              className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-4 text-sm font-semibold text-white disabled:opacity-50 ${focusRing}`}
              data-testid="mfa-remove-confirm"
            >
              {busy ? 'Please wait…' : 'Remove two-factor'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
