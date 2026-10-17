import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function SettingsIcon({ filled = false, className }: Props) {
  const bar = filled ? 3.2 : 1.75
  return (
    <Icon className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth={bar} strokeLinecap="round" />
      <circle cx="9" cy="7" r="2" stroke="currentColor" strokeWidth="1.75" style={{ fill: filled ? 'rgb(var(--c-surface))' : 'rgb(var(--c-bg))' }} />
      <circle cx="15" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" style={{ fill: filled ? 'rgb(var(--c-surface))' : 'rgb(var(--c-bg))' }} />
      <circle cx="8" cy="17" r="2" stroke="currentColor" strokeWidth="1.75" style={{ fill: filled ? 'rgb(var(--c-surface))' : 'rgb(var(--c-bg))' }} />
    </Icon>
  )
}
