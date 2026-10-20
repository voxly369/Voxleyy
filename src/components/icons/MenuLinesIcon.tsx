import { Icon } from './Icon.tsx'

type Props = { className?: string }

export function MenuLinesIcon({ className }: Props) {
  return (
    <Icon className={className}>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </Icon>
  )
}
