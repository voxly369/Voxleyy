import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function BellIcon({ filled = false, className }: Props) {
  return (
    <Icon className={className}>
      <path
        d="M12 4.5a4 4 0 0 0-4 4v1.2c0 .5-.2 1-.5 1.4L6.1 13a1 1 0 0 0 .9 1.5h10a1 1 0 0 0 .9-1.5l-1.4-2.9a2.5 2.5 0 0 1-.5-1.4V8.5a4 4 0 0 0-4-4Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.75}
        strokeLinejoin="round"
      />
      <path d="M10 17a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </Icon>
  )
}
