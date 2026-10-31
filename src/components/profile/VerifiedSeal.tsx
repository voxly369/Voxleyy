import { VERIFIED_SEAL_FILL_DARK, VERIFIED_SEAL_FILL_LIGHT } from '../../lib/design/verifiedSealColors.ts'
import { VERIFIED_SEAL_PX, type VerifiedSealSize } from '../../lib/design/verifiedSealSizes.ts'

export type { VerifiedSealSize }

type VerifiedSealProps = {
  size?: VerifiedSealSize
  className?: string
}

/** Original eight-lobe rosette with tapered check — Voxly coral #FF5A3C, not interactive. */
export function VerifiedSeal({ size = 'sm', className = '' }: VerifiedSealProps) {
  const px = VERIFIED_SEAL_PX[size]
  const strokeWidth = px <= 18 ? 2.1 : 1.75
  return (
    <span
      role="img"
      aria-label="Verified account"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{ width: px, height: px, lineHeight: 0 }}
      data-testid="verified-seal"
      data-seal-size={size}
    >
      <svg viewBox="0 0 24 24" width={px} height={px} aria-hidden="true" className="block">
        <path
          fill={VERIFIED_SEAL_FILL_LIGHT}
          className="dark:hidden"
          d="M12 2.4c.55.95 1.45 1.45 2.45 1.6-.15 1.05.35 2.05 1.2 2.65-.85.6-1.45 1.55-1.65 2.6-1.05-.15-2.05.35-2.65 1.2-.6-.85-1.6-1.35-2.65-1.2-.2-1.05-.8-2-1.65-2.6.85-.6 1.35-1.6 1.2-2.65 1-.15 1.9-.65 2.45-1.6.75.55 1.65.85 2.55.85.9 0 1.8-.3 2.55-.85Z"
        />
        <path
          fill={VERIFIED_SEAL_FILL_DARK}
          className="hidden dark:block"
          d="M12 2.4c.55.95 1.45 1.45 2.45 1.6-.15 1.05.35 2.05 1.2 2.65-.85.6-1.45 1.55-1.65 2.6-1.05-.15-2.05.35-2.65 1.2-.6-.85-1.6-1.35-2.65-1.2-.2-1.05-.8-2-1.65-2.6.85-.6 1.35-1.6 1.2-2.65 1-.15 1.9-.65 2.45-1.6.75.55 1.65.85 2.55.85.9 0 1.8-.3 2.55-.85Z"
        />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.2 12.1 10.6 14.5 15.8 9.3"
        />
      </svg>
    </span>
  )
}
