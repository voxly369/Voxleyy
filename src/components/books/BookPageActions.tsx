import { focusRing } from '../shell/navItems.ts'
import { formatPrice } from '../../lib/books/bookValidation.ts'
import type { BookRecord } from '../../lib/books/bookSchema.ts'

type BookPageActionsProps = {
  book: BookRecord
  isAuthor: boolean
  hasEntitlement: boolean
  paymentsEnabled: boolean
  busy?: boolean
  onClaimFree: () => void
  onContinueReading?: () => void
  onEdit?: () => void
}

export function BookPageActions({
  book,
  isAuthor,
  hasEntitlement,
  paymentsEnabled,
  busy = false,
  onClaimFree,
  onContinueReading,
  onEdit,
}: BookPageActionsProps) {
  const paid = book.saleModel !== 'free'
  const priceLabel = formatPrice(book.saleModel, book.priceCents, book.currency)

  if (isAuthor) {
    return (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onEdit} className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] ${focusRing}`}>
          Open book builder
        </button>
        {book.status === 'unlisted' && paid ? (
          <p className="text-sm text-muted">This paid book is unlisted until payments are enabled.</p>
        ) : null}
      </div>
    )
  }

  if (hasEntitlement) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onContinueReading}
        className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] disabled:opacity-60 ${focusRing}`}
      >
        Continue reading
      </button>
    )
  }

  if (!paid) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onClaimFree}
        className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] disabled:opacity-60 ${focusRing}`}
      >
        Add to library
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-bg p-4">
      <p className="text-sm text-muted">
        {book.status === 'unlisted'
          ? 'This book is unlisted. Purchases are not available yet.'
          : 'Purchases are not available until payments are enabled.'}
      </p>
      <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-xl bg-line px-4 font-semibold text-muted opacity-80">
        Buy for {priceLabel}
      </button>
      {!paymentsEnabled ? <p className="text-xs text-muted">Payments are turned off on this site.</p> : null}
    </div>
  )
}
