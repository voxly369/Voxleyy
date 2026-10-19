import type { CreationType } from '../../lib/creations/creationTypes.ts'

type CreationTypeIconProps = {
  type: CreationType
  className?: string
}

export function CreationTypeIcon({ type, className }: CreationTypeIconProps) {
  const cn = className ?? 'size-8 shrink-0 text-coral'
  if (type === 'quote_card') {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 5h10v14H7V5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === 'journal') {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 4h12v16H6V4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 4v16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 4h14v16H5V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
