import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function ProfileIcon({ filled = false, className }: Props) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="3" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.75} />
      <path
        d="M5.5 19.5a6.5 6.5 0 0 1 13 0"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </Icon>
  )
}
