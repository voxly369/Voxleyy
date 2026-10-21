import { describe, expect, it } from 'vitest'
import { COVER_LAYOUT_PRESETS, coverBoxStyle, coverLayoutPreset } from './coverStudioLayout.ts'

describe('coverStudioLayout', () => {
  it('returns a preset by id', () => {
    expect(coverLayoutPreset('classic_center').id).toBe('classic_center')
    expect(coverLayoutPreset('missing' as never).id).toBe('classic_center')
  })

  it('includes at least eight presets', () => {
    expect(COVER_LAYOUT_PRESETS.length).toBeGreaterThanOrEqual(8)
  })

  it('maps box coordinates to CSS', () => {
    const box = COVER_LAYOUT_PRESETS[0]!.boxes[0]!
    const style = coverBoxStyle(box)
    expect(style.left).toBe(`${box.xPercent}%`)
    expect(style.textAlign).toBe(box.textAlign)
  })
})
