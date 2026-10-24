import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { LegalDraftNotice } from './LegalDraftNotice.tsx'

type LegalPageFrameProps = {
  title: string
  children: ReactNode
  backTo?: string
  backLabel?: string
}

export function LegalPageFrame({ title, children, backTo = '/login', backLabel = 'Back' }: LegalPageFrameProps) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        <LegalDraftNotice />
      </header>
      <div className="prose-legal flex flex-col gap-4 text-base text-ink">{children}</div>
      <p className="text-sm text-muted">
        <Link to={backTo} className={`font-medium text-coral ${focusRing}`}>
          {backLabel}
        </Link>
      </p>
    </article>
  )
}
