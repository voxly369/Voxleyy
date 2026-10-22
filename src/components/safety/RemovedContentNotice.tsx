import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'

type RemovedContentNoticeProps = {
  reason: string | null
  kind: 'creation' | 'comment'
}

export function RemovedContentNotice({ reason, kind }: RemovedContentNoticeProps) {
  const label = kind === 'comment' ? 'comment' : 'post'
  return (
    <div
      data-testid="removed-content-notice"
      role="status"
      className="rounded-2xl border border-line bg-raised/60 p-4 text-base text-ink"
    >
      <p className="font-semibold">Removed by Voxly</p>
      <p className="mt-1 text-sm text-muted">This {label} is no longer public.</p>
      {reason ? <p className="mt-2 text-sm text-ink">{reason}</p> : null}
      <Link
        to="/settings/appeals"
        className={`mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-coral ${focusRing}`}
      >
        Appeal
      </Link>
    </div>
  )
}
