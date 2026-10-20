import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function MoreIcon({ filled = false, className }: Props) {
  const dot = filled ? 2.5 : 2
  return (
    <Icon className={className}>
      <circle cx="5" cy="12" r={dot} fill="currentColor" />
      <circle cx="12" cy="12" r={dot} fill="currentColor" />
      <circle cx="19" cy="12" r={dot} fill="currentColor" />
    </Icon>
  )
}
