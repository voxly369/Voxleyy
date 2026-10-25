import { describe, expect, it } from 'vitest'
import {
  COVER_DESIGN_JSON_MAX_BYTES,
  COVER_DESIGN_WIDTH,
  coverDesignDocumentSchema,
  emptyCoverDesign,
  parseCoverDesignJson,
} from './designSchema.ts'

describe('designSchema', () => {
  it('emptyCoverDesign uses 1600x2400', () => {
    const doc = emptyCoverDesign()
    expect(doc.width).toBe(COVER_DESIGN_WIDTH)
    expect(doc.height).toBe(2400)
    expect(doc.version).toBe(1)
  })

  it('parseCoverDesignJson accepts valid document', () => {
    const doc = emptyCoverDesign()
    expect(parseCoverDesignJson(doc)).toEqual(doc)
  })

  it('parseCoverDesignJson rejects wrong dimensions', () => {
    expect(parseCoverDesignJson({ ...emptyCoverDesign(), width: 800 })).toBeNull()
  })

  it('parseCoverDesignJson rejects oversized json', () => {
    const huge = emptyCoverDesign()
    huge.layers = Array.from({ length: 200 }, (_, i) => ({
      id: `t-${i}`,
      type: 'text' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: false,
      text: 'x'.repeat(2500),
      fontFamily: 'Fraunces',
      fontSize: 24,
      fontWeight: 400,
      fontStyle: 'normal' as const,
      color: '#fff',
      align: 'left' as const,
      lineHeight: 1.2,
      letterSpacing: 0,
      uppercase: false,
      shadow: null,
      outline: null,
      highlight: null,
    }))
    const bytes = new TextEncoder().encode(JSON.stringify(huge)).length
    expect(bytes).toBeGreaterThan(COVER_DESIGN_JSON_MAX_BYTES)
    expect(parseCoverDesignJson(huge)).toBeNull()
  })

  it('coverDesignDocumentSchema validates version', () => {
    expect(coverDesignDocumentSchema.safeParse(emptyCoverDesign()).success).toBe(true)
  })
})
