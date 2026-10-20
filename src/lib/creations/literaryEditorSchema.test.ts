import { describe, expect, it } from 'vitest'
import { parseRichDocument, validateRichDocumentSize } from './richDocument.ts'
import { trimLiteraryRichDocument } from './literaryDisplay.ts'

describe('literary editor output schema', () => {
  it('accepts trimmed literary rich documents within size limits', () => {
    const doc = trimLiteraryRichDocument(
      parseRichDocument({
        version: 1,
        format: 'rich',
        content: [
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line one' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Line two' }] },
        ],
      })!,
    )
    expect(parseRichDocument(doc)).not.toBeNull()
    expect(validateRichDocumentSize(doc).ok).toBe(true)
  })
})
