import { useId } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { quietPromptMessage } from '../../lib/messages/quietPrompt.ts'
import type { QuietStatus } from '../../lib/messages/types.ts'

type ConsiderateSendingModalProps = {
  open: boolean
  displayName: string
  quietStatus: QuietStatus
  busy?: boolean
  onCancel: () => void
  onSendAnyway: () => void
}

export function ConsiderateSendingModal({
  open,
  displayName,
  quietStatus,
  busy = false,
  onCancel,
  onSendAnyway,
}: ConsiderateSendingModalProps) {
  const titleId = useId()
  const messageId = useId()
  const message = quietPromptMessage(quietStatus, displayName)

  return (
    <Modal
      open={open}
      onClose={onCancel}
      closeOnEscape={!busy}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={messageId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <h2 id={titleId} className="font-serif text-xl text-ink">
        Send anyway?
      </h2>
      <p id={messageId} className="mt-2 text-base text-muted">
        {message}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={`min-h-11 rounded-2xl px-4 text-base font-medium text-ink ${focusRing}`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSendAnyway}
          disabled={busy}
          data-testid="considerate-send-confirm"
          className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </Modal>
  )
}
