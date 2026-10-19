import { useEffect, useId, useRef } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeOnEscape={!busy}
      returnFocusRef={returnFocusRef}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={messageId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <h2 id={titleId} className="font-serif text-xl text-ink">
        {title}
      </h2>
      <p id={messageId} className="mt-2 text-base text-muted">
        {message}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={`min-h-11 rounded-2xl px-4 text-base font-medium text-ink ${focusRing}`}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white disabled:opacity-50 ${focusRing}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
