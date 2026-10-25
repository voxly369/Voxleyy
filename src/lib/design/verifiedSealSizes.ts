export type VerifiedSealSize = 'sm' | 'md' | 'lg'

/** Pixel sizes: ~1.15× cap height of adjacent text per design system. */
export const VERIFIED_SEAL_PX = {
  sm: 18,
  md: 24,
  lg: 28,
} as const satisfies Record<VerifiedSealSize, number>

export type VerifiedSealPlacement =
  | 'feed'
  | 'profileHeader'
  | 'aboutSheetName'
  | 'aboutSheetVerifiedRow'

export function verifiedSealSizeForPlacement(placement: VerifiedSealPlacement): VerifiedSealSize {
  switch (placement) {
    case 'feed':
      return 'sm'
    case 'profileHeader':
    case 'aboutSheetVerifiedRow':
      return 'md'
    case 'aboutSheetName':
      return 'lg'
    default:
      return 'sm'
  }
}

export function verifiedSealPixelsForPlacement(placement: VerifiedSealPlacement): number {
  return VERIFIED_SEAL_PX[verifiedSealSizeForPlacement(placement)]
}
