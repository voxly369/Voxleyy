import { describe, expect, it } from 'vitest'
import {
  VERIFIED_SEAL_PX,
  verifiedSealPixelsForPlacement,
  verifiedSealSizeForPlacement,
} from './verifiedSealSizes.ts'

describe('verifiedSealSizes', () => {
  it('returns token and pixel size for each placement', () => {
    expect(verifiedSealSizeForPlacement('feed')).toBe('sm')
    expect(verifiedSealPixelsForPlacement('feed')).toBe(18)
    expect(verifiedSealSizeForPlacement('profileHeader')).toBe('md')
    expect(verifiedSealPixelsForPlacement('profileHeader')).toBe(24)
    expect(verifiedSealSizeForPlacement('aboutSheetName')).toBe('lg')
    expect(verifiedSealPixelsForPlacement('aboutSheetName')).toBe(28)
    expect(verifiedSealSizeForPlacement('aboutSheetVerifiedRow')).toBe('md')
    expect(verifiedSealPixelsForPlacement('aboutSheetVerifiedRow')).toBe(24)
  })

  it('documents the sm/md/lg pixel map', () => {
    expect(VERIFIED_SEAL_PX).toEqual({ sm: 18, md: 24, lg: 28 })
  })
})
