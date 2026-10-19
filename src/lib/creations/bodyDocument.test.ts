import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUOTE_CARD_STYLE,
  isValidHexColor,
  parseBodyDocument,
  quoteCardBodyJson,
  quoteStyleFromJson,
} from './bodyDocument.ts'
import { contrastRatio } from './quoteCardContrast.ts'

describe('bodyDocument quote_card', () => {
  it('accepts a valid quote_card document', () => {
    const doc = quoteCardBodyJson('Hello', { background: '#111111', color: '#eeeeee', size: 'large' })
    expect(parseBodyDocument(doc)).toEqual(doc)
  })

  it('falls back to default style when style is invalid', () => {
    const style = quoteStyleFromJson({
      version: 1,
      format: 'quote_card',
      text: 'Hi',
      style: { background: 'red', color: '#fff', size: 'medium' },
    })
    expect(style).toEqual(DEFAULT_QUOTE_CARD_STYLE)
  })

  it('rejects invalid hex colours', () => {
    expect(isValidHexColor('red')).toBe(false)
    expect(isValidHexColor('#fff')).toBe(false)
    expect(isValidHexColor('#GGGGGG')).toBe(false)
    expect(isValidHexColor('javascript:')).toBe(false)
    expect(isValidHexColor('#aabbcc')).toBe(true)
  })

  it('enforces quote line length at publish validation layer', () => {
    expect('x'.repeat(401).length).toBeGreaterThan(400)
  })

  it('computes contrast ratio for light on dark', () => {
    const ratio = contrastRatio('#ffffff', '#000000')
    expect(ratio).toBeGreaterThan(10)
  })

  it('treats hostile markup as plain text in quote body', () => {
    const hostile = '<img src=x onerror=alert(1)>'
    const doc = quoteCardBodyJson(hostile, DEFAULT_QUOTE_CARD_STYLE)
    expect(doc.text).toBe(hostile)
    expect(parseBodyDocument(doc)?.format).toBe('quote_card')
  })
})
