import { useId, useRef, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { deleteMyAccount, downloadJsonExport, exportMyData } from '../../lib/account/dataExport.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'

type DeleteAccountModalProps = {
  open: boolean
  onClose: () => void
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const titleId = useId()
  const descId = useId()
  const returnFocusRef = useRef<HTMLButtonElement>(null)
  const { signOut, profile } = useAuth()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [exportDone, setExportDone] = useState(false)

  const username = profile?.username ?? ''
  const canDelete = confirmText.trim().toLowerCase() === username.toLowerCase() && username.length > 0

  function resetState() {
    setConfirmText('')
    setError('')
    setExportDone(false)
    setBusy(false)
  }

  function handleClose() {
    if (busy) return
    resetState()
    onClose()
  }

  async function handleExport() {
    setBusy(true)
    setError('')
    const result = await exportMyData()
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    downloadJsonExport(`voxly-export-${username || 'account'}.json`, result.payload)
    setExportDone(true)
  }

  async function handleDelete() {
    if (!canDelete || busy) return
    setBusy(true)
    setError('')
    const result = await deleteMyAccount()
    if (!result.ok) {
      setBusy(false)
      setError(result.message)
      return
    }
    resetState()
    onClose()
    await signOut()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeOnEscape={!busy}
      returnFocusRef={returnFocusRef}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <div data-testid="delete-account-modal">
        <h2 id={titleId} className="font-serif text-xl text-ink">
          Delete account
        </h2>
        <p id={descId} className="mt-3 text-sm text-muted">
          This permanently removes your profile, posts, and library data. Download a copy first if you want to keep
          anything.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-line bg-raised px-4 text-sm font-semibold text-ink disabled:opacity-50 ${focusRing}`}
            data-testid="delete-account-export"
          >
            {exportDone ? 'Downloaded export' : 'Download my data first'}
          </button>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-sm text-ink" htmlFor="delete-account-confirm">
          Type your username <span className="font-semibold">@{username}</span> to confirm
          <input
            id="delete-account-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
            data-testid="delete-account-confirm-input"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-coral">
            {error}
          </p>
        ) : null}
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
            disabled={!canDelete || busy}
            onClick={() => void handleDelete()}
            className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-4 text-sm font-semibold text-white disabled:opacity-50 ${focusRing}`}
            data-testid="delete-account-submit"
          >
            {busy ? 'Please wait…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
