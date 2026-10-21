import { describe, expect, it } from 'vitest'
import { COVER_EXPORT_HEIGHT, COVER_EXPORT_WIDTH } from './coverExport.ts'
import { COVER_LAYOUT_PRESETS } from './coverStudioLayout.ts'

describe('coverExport', () => {
  it('uses 1600x2400 export dimensions', () => {
    expect(COVER_EXPORT_WIDTH).toBe(1600)
    expect(COVER_EXPORT_HEIGHT).toBe(2400)
  })

  it('defines at least eight layout presets', () => {
    expect(COVER_LAYOUT_PRESETS.length).toBeGreaterThanOrEqual(8)
  })
})
