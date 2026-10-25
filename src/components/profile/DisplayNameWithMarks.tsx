import type { ReactNode } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { VerifiedSeal, type VerifiedSealSize } from './VerifiedSeal.tsx'

type DisplayNameWithMarksProps = {
  name: string
  verified?: boolean
  sealSize?: VerifiedSealSize
  badges?: ReactNode
  /** When true, name truncates but badges/seal stay visible (feed rows, lists). */
  truncate?: boolean
  /** Opens About this profile when the verified seal is tapped (profile header). */
  onVerifiedSealClick?: () => void
  /** Reserves space for a clickable verified seal so the name truncates only when needed. */
  reserveVerifiedSealSpace?: boolean
  className?: string
  nameClassName?: string
  as?: 'span' | 'h1'
}

export function DisplayNameWithMarks({
  name,
  verified = false,
  sealSize = 'sm',
  badges = null,
  truncate = true,
  onVerifiedSealClick,
  reserveVerifiedSealSpace = false,
  className = '',
  nameClassName = '',
  as: Tag = 'span',
}: DisplayNameWithMarksProps) {
  const seal = verified ? <VerifiedSeal size={sealSize} /> : null
  return (
    <Tag
      className={`flex max-w-full min-w-0 items-center gap-x-1 ${className}`}
      data-testid="display-name-with-marks"
    >
      <span
        data-testid="display-name-text"
        className={`min-w-0 ${truncate ? 'truncate' : ''} ${
          reserveVerifiedSealSpace ? 'max-w-[calc(100%-2.75rem)]' : ''
        } ${nameClassName}`}
      >
        {name}
      </span>
      {verified && seal ? (
        <>
          <span className="sr-only">, </span>
          {onVerifiedSealClick ? (
            <button
              type="button"
              onClick={onVerifiedSealClick}
              className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center ${focusRing}`}
              aria-label="About this profile"
              data-testid="profile-verified-seal-button"
            >
              {seal}
            </button>
          ) : (
            seal
          )}
        </>
      ) : null}
      {badges ? (
        <>
          <span className="sr-only">, </span>
          {badges}
        </>
      ) : null}
    </Tag>
  )
}
