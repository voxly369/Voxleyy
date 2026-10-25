import type { ReactNode } from 'react'
import { VerifiedSeal, type VerifiedSealSize } from './VerifiedSeal.tsx'

type DisplayNameWithMarksProps = {
  name: string
  verified?: boolean
  sealSize?: VerifiedSealSize
  badges?: ReactNode
  /** When true, name truncates but badges/seal stay visible (feed rows, lists). */
  truncate?: boolean
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
  className = '',
  nameClassName = '',
  as: Tag = 'span',
}: DisplayNameWithMarksProps) {
  return (
    <Tag
      className={`inline-flex max-w-full min-w-0 items-center gap-x-1 ${className}`}
      data-testid="display-name-with-marks"
    >
      <span className={`min-w-0 ${truncate ? 'truncate' : ''} ${nameClassName}`}>{name}</span>
      {verified ? (
        <>
          <span className="sr-only">, </span>
          <VerifiedSeal size={sealSize} />
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
