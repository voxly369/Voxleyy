import { describe, expect, it } from 'vitest'
import {
  docToEditorJson,
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

  it('round-trips a heading with hardBreak and bold through editor JSON', () => {
    const doc = {
      version: 1 as const,
      format: 'rich' as const,
      content: [
        {
          type: 'heading' as const,
          level: 2 as const,
          content: [
            { type: 'text' as const, text: 'Line one' },
            { type: 'hardBreak' as const },
            { type: 'text' as const, text: 'Line two', marks: ['bold' as const] },
          ],
        },
      ],
    }
    const json = docToEditorJson(doc)
    const back = editorJsonToDoc(json)
    expect(back).toEqual(doc)
    expect(editorJsonToDoc(json)).toEqual(doc)
  })

  it('splits newline characters inside editor text nodes into hardBreaks', () => {
    const parsed = editorJsonToDoc({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'a\nb' }],
        },
      ],
    })
    expect(parsed?.content[0]).toMatchObject({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'a' },
        { type: 'hardBreak' },
        { type: 'text', text: 'b' },
      ],
    })
  })
})
