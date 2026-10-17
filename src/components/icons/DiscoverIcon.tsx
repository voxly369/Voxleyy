import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function DiscoverIcon({ filled = false, className }: Props) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" fill={filled ? 'currentColor' : 'none'} />
      <path
        d="m14.8 9.2-1.2 4.4-4.4 1.2 1.2-4.4 4.4-1.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ fill: filled ? 'rgb(var(--c-surface))' : 'none' }}
      />
    </Icon>
  )
}
