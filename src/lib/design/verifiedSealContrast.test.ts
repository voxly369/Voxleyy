import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../creations/quoteCardContrast.ts'
import { VERIFIED_SEAL_FILL_DARK, VERIFIED_SEAL_FILL_LIGHT } from './verifiedSealColors.ts'
import { VERIFIED_SEAL_PX } from './verifiedSealSizes.ts'

/** Surfaces from `src/index.css` design tokens where the seal sits beside text. */
const VERIFIED_SEAL_SURFACE_LIGHT = '#FFFFFF'
const VERIFIED_SEAL_SURFACE_DARK = '#0A0A0B'

const MIN_NON_TEXT_CONTRAST = 3

describe('verified seal contrast', () => {
  it('coral fill meets 3:1 non-text contrast on light and dark surfaces at 18px, 24px and 28px', () => {
    const sizes = [VERIFIED_SEAL_PX.sm, VERIFIED_SEAL_PX.md, VERIFIED_SEAL_PX.lg] as const
    const lightRatio = contrastRatio(VERIFIED_SEAL_FILL_LIGHT, VERIFIED_SEAL_SURFACE_LIGHT)
    const darkRatio = contrastRatio(VERIFIED_SEAL_FILL_DARK, VERIFIED_SEAL_SURFACE_DARK)
    for (const px of sizes) {
      expect(lightRatio, `light surface at ${px}px`).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)
      expect(darkRatio, `dark surface at ${px}px`).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)
    }
    expect(Math.round(lightRatio * 100) / 100).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)
    expect(Math.round(darkRatio * 100) / 100).toBeGreaterThanOrEqual(MIN_NON_TEXT_CONTRAST)
  })
})
