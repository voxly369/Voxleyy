import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function HomeIcon({ filled = false, className }: Props) {
  return (
    <Icon className={className}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.75}
        strokeLinejoin="round"
      />
    </Icon>
  )
}
