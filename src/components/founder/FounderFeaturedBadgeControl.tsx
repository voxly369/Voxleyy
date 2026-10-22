import { useState } from 'react'
import { awardFeaturedBadge, removeFeaturedBadge } from '../../lib/badges/api.ts'
import { focusRing } from '../shell/navItems.ts'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'

type FounderFeaturedBadgeControlProps = {
  userId: string
  displayName: string
  hasFeatured?: boolean
  onChange?: () => void
}

export function FounderFeaturedBadgeControl({
  userId,
  displayName,
  hasFeatured = false,
  onChange,
}: FounderFeaturedBadgeControlProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [featured, setFeatured] = useState(hasFeatured)
  const [confirmRemove, setConfirmRemove] = useState(false)

  async function grant() {
    setBusy(true)
    setError(null)
    const result = await awardFeaturedBadge(userId)
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setFeatured(true)
    onChange?.()
  }

  async function revoke() {
    setBusy(true)
    setError(null)
    const result = await removeFeaturedBadge(userId)
    setBusy(false)
    setConfirmRemove(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setFeatured(false)
    onChange?.()
  }

  return (
    <div className="mt-3 flex flex-col gap-2" data-testid="founder-featured-badge-control">
      <p className="text-sm font-semibold text-ink">Featured badge</p>
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
      {featured ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmRemove(true)}
          className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold text-ink ${focusRing}`}
        >
          Remove Featured
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void grant()}
          className={`min-h-11 self-start rounded-2xl bg-coral px-4 text-sm font-semibold text-white ${focusRing}`}
        >
          Award Featured
        </button>
      )}
      <ConfirmDialog
        open={confirmRemove}
        title="Remove Featured badge?"
        message={`Remove the Featured badge from ${displayName}?`}
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => void revoke()}
      />
    </div>
  )
}
