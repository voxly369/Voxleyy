import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { parseWebsite } from '../../lib/profiles/website.ts'

export function SafeWebsite({ value }: { value: string | null }) {
  const parsed = value ? parseWebsite(value) : null
  if (!parsed || !parsed.ok || !parsed.link) return null

  return (
    <a
      href={parsed.link.href}
      rel="noopener noreferrer nofollow ugc"
      target="_blank"
      className={`inline-flex min-h-11 items-center text-base text-coral underline underline-offset-2 ${focusRing}`}
    >
      {parsed.link.label}
    </a>
  )
}

export function CountLink({ to, count, label }: { to?: string; count: number; label: string }) {
  const content = (
    <>
      <span className="font-semibold text-ink">{count}</span>
      <span className="text-muted"> {label}</span>
    </>
  )
  if (!to) {
    return <span className="inline-flex min-h-11 items-center text-sm">{content}</span>
  }
  return (
    <Link to={to} className={`inline-flex min-h-11 items-center rounded-xl px-1 text-sm ${focusRing}`}>
      {content}
    </Link>
  )
}
