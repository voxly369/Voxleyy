import { describe, expect, it } from 'vitest'
import { bodyDocumentFromText, bodyOctets, countLines } from './bodyDocument.ts'
import { MAX_BODY_TEXT_OCTETS } from './limits.ts'

describe('bodyDocument', () => {
  it('counts lines and bytes consistently with limits', () => {
    expect(countLines('a\nb\n')).toBe(3)
    const at = 'a'.repeat(MAX_BODY_TEXT_OCTETS)
    expect(bodyOctets(at)).toBe(MAX_BODY_TEXT_OCTETS)
    expect(bodyDocumentFromText('hello').text).toBe('hello')
  })
})
