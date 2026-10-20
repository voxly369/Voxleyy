import { Link } from 'react-router-dom'
import { formatCountLabel, type CountNoun } from '../../lib/formatCountLabel.ts'
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

export function CountLink({ to, count, noun }: { to?: string; count: number; noun: CountNoun }) {
  const label = formatCountLabel(count, noun)
  const content = <span className="text-sm text-ink">{label}</span>
  if (!to) {
    return <span className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap">{content}</span>
  }
  return (
    <Link
      to={to}
      className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl px-1 ${focusRing}`}
    >
      {content}
    </Link>
  )
}
