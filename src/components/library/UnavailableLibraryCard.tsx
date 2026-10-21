import { focusRing } from '../shell/navItems.ts'

type UnavailableLibraryCardProps = {
  onRemove: () => void
  removeLabel?: string
}

export function UnavailableLibraryCard({ onRemove, removeLabel = 'Remove' }: UnavailableLibraryCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-medium text-ink">No longer available</p>
      <p className="mt-1 text-sm text-muted">This work was removed, made private, or is no longer visible to you.</p>
      <button
        type="button"
        onClick={onRemove}
        className={`mt-3 inline-flex min-h-11 items-center rounded-2xl border border-line bg-raised px-4 text-sm font-medium text-ink ${focusRing}`}
      >
        {removeLabel}
      </button>
    </article>
  )
}
