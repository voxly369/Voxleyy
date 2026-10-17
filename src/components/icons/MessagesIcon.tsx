import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function MessagesIcon({ filled = false, className }: Props) {
  return (
    <Icon className={className}>
      <path
        d="M6 16.5 4 20l4.2-1.6A8 8 0 1 0 6 16.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.75}
        strokeLinejoin="round"
      />
    </Icon>
  )
}
