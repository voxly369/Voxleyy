import { useEffect, useId, useRef, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { MfaCodeField } from '../auth/MfaCodeField.tsx'
import { totpUriToQrDataUrl } from '../../lib/auth/mfa/qrCode.ts'
import {
  MFA_KEEP_DEVICE_SAFE,
  MFA_LOST_DEVICE,
} from '../../lib/auth/mfa/messages.ts'
import { confirmTotpEnroll, startTotpEnroll } from '../../lib/auth/mfa/totp.ts'

type MfaEnrollModalProps = {
  open: boolean
  onClose: () => void
  onEnrolled: () => void
}

export function MfaEnrollModal({ open, onClose, onEnrolled }: MfaEnrollModalProps) {
  const titleId = useId()
  const descId = useId()
  const returnFocusRef = useRef<HTMLButtonElement>(null)
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [qrSrc, setQrSrc] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    setCode('')
    void startTotpEnroll().then(async (result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setFactorId(result.data.factorId)
      setSecret(result.data.secret)
      try {
        const dataUrl = await totpUriToQrDataUrl(result.data.uri)
        if (!cancelled) setQrSrc(dataUrl)
      } catch {
        if (!cancelled) setError('We could not draw the QR code. Use the manual secret below.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  function handleClose() {
    if (busy) return
    setSecret('')
    setFactorId('')
    setQrSrc('')
    setCode('')
    setError('')
    onClose()
  }

  async function handleConfirm() {
    if (!factorId || code.length !== 6 || busy) return
    setBusy(true)
    setError('')
    const result = await confirmTotpEnroll(factorId, code)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onEnrolled()
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeOnEscape={!busy}
      returnFocusRef={returnFocusRef}
      role="dialog"
      labelledBy={titleId}
      describedBy={descId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <div data-testid="mfa-enroll-modal">
        <h2 id={titleId} className="font-serif text-xl text-ink">
          Set up authenticator app
        </h2>
        <p id={descId} className="mt-3 text-sm text-muted">
          Scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy, or similar), or enter
          the secret manually.
        </p>
        {loading ? <p className="mt-4 text-sm text-muted">Preparing your code…</p> : null}
        {qrSrc ? (
          <img
            src={qrSrc}
            alt="QR code for authenticator setup"
            className="mt-4 mx-auto rounded-xl border border-line bg-white p-2"
            width={220}
            height={220}
          />
        ) : null}
        {secret ? (
          <p className="mt-4 break-all font-mono text-xs text-ink" data-testid="mfa-enroll-secret">
            Manual secret: {secret}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted">{MFA_KEEP_DEVICE_SAFE}</p>
        <p className="mt-2 text-sm text-muted">{MFA_LOST_DEVICE}</p>
        <div className="mt-4">
          <MfaCodeField id="mfa-enroll-code" value={code} onChange={setCode} error={error} disabled={busy || loading} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className={`inline-flex min-h-11 items-center rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || loading || code.length !== 6 || !factorId}
            onClick={() => void handleConfirm()}
            className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-4 text-sm font-semibold text-white disabled:opacity-50 ${focusRing}`}
            data-testid="mfa-enroll-confirm"
          >
            {busy ? 'Please wait…' : 'Confirm and enable'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
