import { Icon } from './Icon.tsx'

type Props = { filled?: boolean; className?: string }

export function PlusIcon({ filled = false, className }: Props) {
  if (filled) {
    return (
      <Icon className={className}>
        <path fill="currentColor" d="M10.25 4h3.5v6.25H20v3.5h-6.25V20h-3.5v-6.25H4v-3.5h6.25V4Z" />
      </Icon>
    )
  }

  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </Icon>
  )
}
