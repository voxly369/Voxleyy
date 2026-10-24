import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: string | number
  hint?: ReactNode
  testId?: string
}

export function MetricCard({ label, value, hint, testId }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4" data-testid={testId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-serif text-2xl text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </article>
  )
}
