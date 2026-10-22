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
      <p className="font-semibold">This {label} was removed</p>
      {reason ? <p className="mt-2 text-sm text-muted">{reason}</p> : null}
      <p className="mt-2 text-sm text-muted">You can submit an appeal from Settings → Appeals.</p>
    </div>
  )
}
