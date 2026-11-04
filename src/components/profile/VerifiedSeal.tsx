import { VERIFIED_SEAL_FILL_DARK, VERIFIED_SEAL_FILL_LIGHT } from '../../lib/design/verifiedSealColors.ts'
import { VERIFIED_SEAL_PX, type VerifiedSealSize } from '../../lib/design/verifiedSealSizes.ts'

export type { VerifiedSealSize }

type VerifiedSealProps = {
  size?: VerifiedSealSize
  className?: string
}

const ROSETTE_VIEW = 24
const ROSETTE_CENTER = ROSETTE_VIEW / 2
const SCALLOP_COUNT = 12

/** Polar rosette: r(θ) = mid + amp·cos(nθ) → n evenly spaced scallops. */
function scallopedRosettePath(
  cx: number,
  cy: number,
  midRadius: number,
  amplitude: number,
  scallops: number,
  segmentsPerScallop = 8,
): string {
  const steps = scallops * segmentsPerScallop
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2
    const r = midRadius + amplitude * Math.cos(scallops * t)
    const x = cx + r * Math.cos(t)
    const y = cy + r * Math.sin(t)
    const pair = `${x.toFixed(3)} ${y.toFixed(3)}`
    d += i === 0 ? `M ${pair}` : ` L ${pair}`
  }
  return `${d} Z`
}

const ROSETTE_PATH = scallopedRosettePath(ROSETTE_CENTER, ROSETTE_CENTER, 8.75, 3.25, SCALLOP_COUNT)

/** Twelve-scallop coral rosette with centred check — Voxly #FF5A3C, not interactive. */
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
      <svg viewBox={`0 0 ${ROSETTE_VIEW} ${ROSETTE_VIEW}`} width={px} height={px} aria-hidden="true" className="block">
        <path fill={VERIFIED_SEAL_FILL_LIGHT} className="dark:hidden" d={ROSETTE_PATH} />
        <path fill={VERIFIED_SEAL_FILL_DARK} className="hidden dark:block" d={ROSETTE_PATH} />
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
