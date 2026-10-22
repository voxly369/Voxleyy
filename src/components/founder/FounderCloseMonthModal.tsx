import { useState } from 'react'
import { closeMonth } from '../../lib/badges/api.ts'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'

type FounderCloseMonthModalProps = {
  open: boolean
  month: string
  onClose: () => void
  onClosed?: () => void
}

export function FounderCloseMonthModal({ open, month, onClose, onClosed }: FounderCloseMonthModalProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    const result = await closeMonth(month)
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    onClosed?.()
    onClose()
  }

  return (
    <ConfirmDialog
      open={open}
      title="Close month?"
      message={
        error
          ? error
          : `Close ${month} and award performance badges? This runs stored rules for every writer.`
      }
      confirmLabel={busy ? 'Closing…' : 'Close month'}
      onCancel={onClose}
      onConfirm={() => void confirm()}
    />
  )
}
