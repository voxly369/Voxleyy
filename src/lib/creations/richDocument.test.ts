import { describe, expect, it } from 'vitest'
import {
  editorJsonToDoc,
  parseRichDocument,
  plainToRich,
  richToPlainText,
  validateRichDocumentSize,
} from './richDocument.ts'

describe('richDocument', () => {
  it('round-trips plain paragraphs and hard breaks', () => {
    const doc = plainToRich('Line one\nLine two\n\nSecond stanza')
    expect(richToPlainText(doc)).toBe('Line one\nLine two\n\nSecond stanza')
  })

  it('rejects unknown node types and marks', () => {
    expect(parseRichDocument({ version: 1, format: 'rich', content: [{ type: 'codeBlock' }] })).toBeNull()
    expect(
      parseRichDocument({
        version: 1,
        format: 'rich',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: ['link'] }] }],
      }),
    ).toBeNull()
  })

  it('maps TipTap JSON through zod', () => {
    const doc = editorJsonToDoc({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }],
        },
      ],
    })
    expect(doc?.content[0]).toMatchObject({ type: 'paragraph' })
  })

  it('rejects oversized documents', () => {
    const huge = plainToRich('x'.repeat(600_000))
    const result = validateRichDocumentSize(huge)
    expect(result.ok).toBe(false)
  })
})
