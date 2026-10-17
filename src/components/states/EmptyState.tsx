import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6">
      {icon}
      <div className="flex flex-col gap-2">
        <p className="font-serif text-2xl text-ink">{title}</p>
        <p className="text-base text-muted">{message}</p>
      </div>
      {action}
    </div>
  )
}
