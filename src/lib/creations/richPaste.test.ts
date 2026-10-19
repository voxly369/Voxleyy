import { describe, expect, it } from 'vitest'
import { normalizePlainTextForRich, richToPlainText, validateRichDocumentSize } from './richDocument.ts'
import { plainTextToRichDocument } from './richPaste.ts'

describe('richPaste plain text conversion', () => {
  it('turns a 3-stanza poem into paragraphs with hardBreaks between lines', () => {
    const text = 'Line 1\nLine 2\n\nStanza two\n\nThird block'
    const doc = plainTextToRichDocument(text)
    expect(doc.content).toHaveLength(3)
    expect(doc.content[0]?.type).toBe('paragraph')
    expect(doc.content[0]?.content).toEqual([
      { type: 'text', text: 'Line 1' },
      { type: 'hardBreak' },
      { type: 'text', text: 'Line 2' },
    ])
    expect(richToPlainText(doc)).toBe(text)
  })

  it('treats \\r\\n the same as \\n', () => {
    const a = plainTextToRichDocument('A\r\nB')
    const b = plainTextToRichDocument('A\nB')
    expect(a).toEqual(b)
  })

  it('strips control characters except newline and tab', () => {
    const doc = plainTextToRichDocument('Hello\u0007world')
    expect(richToPlainText(doc)).toBe('Helloworld')
  })

  it('keeps hostile markup as visible text', () => {
    const hostile = '<img src=x onerror=alert(1)>'
    const doc = plainTextToRichDocument(hostile)
    expect(richToPlainText(doc)).toBe(hostile)
  })

  it('refuses over-limit paste via validateRichDocumentSize', () => {
    const doc = plainTextToRichDocument('x'.repeat(600_000))
    expect(validateRichDocumentSize(doc).ok).toBe(false)
  })
})

describe('normalizePlainTextForRich', () => {
  it('normalises line endings', () => {
    expect(normalizePlainTextForRich('a\r\nb')).toBe('a\nb')
  })
})
