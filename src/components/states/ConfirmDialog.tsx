import { useEffect, useId, useRef } from 'react'
import { focusRing } from '../shell/navItems.ts'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      lastFocus.current?.focus()
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
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
            className={`min-h-11 rounded-2xl px-4 text-base font-medium text-ink ${focusRing}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
