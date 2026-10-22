import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { listUnseenWarnings, markWarningSeen } from '../../lib/safety/warningsApi.ts'
import type { WarningRow } from '../../lib/safety/types.ts'

export function WarningModal() {
  const titleId = useId()
  const [queue, setQueue] = useState<WarningRow[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await listUnseenWarnings()
      if (!active || !result.ok) return
      if (result.data.length > 0) {
        setQueue(result.data)
        setOpen(true)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const current = queue[0]

  async function acknowledge() {
    if (!current || busy) return
    setBusy(true)
    await markWarningSeen(current.id)
    setBusy(false)
    setQueue((prev) => prev.slice(1))
    if (queue.length <= 1) setOpen(false)
  }

  if (!current) return null

  return (
    <Modal
      open={open}
      onClose={() => void acknowledge()}
      closeOnEscape={!busy}
      role="alertdialog"
      labelledBy={titleId}
      className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
    >
      <h2 id={titleId} className="font-serif text-xl text-ink">
        Warning from the Founder
      </h2>
      <p className="mt-3 whitespace-pre-wrap text-base text-ink">{current.message}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void acknowledge()}
        className={`mt-5 inline-flex min-h-11 items-center rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-50 ${focusRing}`}
      >
        {busy ? 'Please wait…' : 'I understand'}
      </button>
    </Modal>
  )
}
