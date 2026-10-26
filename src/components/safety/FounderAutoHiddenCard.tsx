import { useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { removeContent, restoreContent } from '../../lib/safety/founderApi.ts'
import { FounderReasonModal } from './FounderReasonModal.tsx'
import type { FounderAutoHiddenRow } from '../../lib/safety/types.ts'

type Props = {
  row: FounderAutoHiddenRow
  onActionComplete: () => void
}

export function FounderAutoHiddenCard({ row, onActionComplete }: Props) {
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onRestore(reason: string) {
    setBusy(true)
    setError(null)
    const result = await restoreContent('creation', row.creation_id, reason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRestoreOpen(false)
    onActionComplete()
  }

  async function onRemove(reason: string) {
    setBusy(true)
    setError(null)
    const result = await removeContent('creation', row.creation_id, reason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRemoveOpen(false)
    onActionComplete()
  }

  return (
    <article
      className="rounded-2xl border border-coral/40 bg-surface p-4"
      data-testid={`founder-auto-hidden-${row.creation_id}`}
    >
      <p className="text-xs uppercase text-muted">
        Auto-hidden · {row.distinct_reporter_count} distinct reports · @{row.author_username}
      </p>
      <p className="mt-2 font-medium text-ink">{row.title?.trim() || row.caption?.trim() || 'Untitled post'}</p>
      {row.body_excerpt ? <p className="mt-1 line-clamp-3 text-sm text-muted">{row.body_excerpt}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-coral">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setRestoreOpen(true)}
          className={`min-h-11 rounded-2xl px-4 text-sm font-semibold text-coral ${focusRing}`}
        >
          Restore
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRemoveOpen(true)}
          className={`min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        >
          Remove
        </button>
      </div>
      <FounderReasonModal
        open={restoreOpen}
        title="Restore auto-hidden post"
        confirmLabel="Restore"
        busy={busy}
        onCancel={() => setRestoreOpen(false)}
        onConfirm={(reason) => void onRestore(reason)}
      />
      <FounderReasonModal
        open={removeOpen}
        title="Remove auto-hidden post"
        confirmLabel="Remove"
        busy={busy}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={(reason) => void onRemove(reason)}
      />
    </article>
  )
}
