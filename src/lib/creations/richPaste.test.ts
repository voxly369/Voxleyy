import { describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/react'
import * as richDocument from './bodyDocument.ts'
import {
  pastePlainTextIntoEditor,
  plainTextToRichDocument,
  PASTE_UNREADABLE_MESSAGE,
  PASTE_TOO_LONG_MESSAGE,
} from './richPaste.ts'
import { richToPlainText } from './bodyDocument.ts'

describe('pastePlainTextIntoEditor', () => {
  it('returns unreadable message when current editor content cannot convert', () => {
    vi.spyOn(richDocument, 'editorJsonToDoc').mockReturnValueOnce(null)
    const editor = {
      getJSON: () => ({}),
      isActive: () => false,
      chain: () => ({ focus: () => ({ insertContent: () => ({ run: () => true }) }) }),
    } as unknown as Editor

    const result = pastePlainTextIntoEditor(editor, 'hello')
    expect(result).toEqual({ ok: false, message: PASTE_UNREADABLE_MESSAGE })
    expect(result.ok === false && result.message).not.toBe(PASTE_TOO_LONG_MESSAGE)
  })

  it('builds three paragraph stanzas from a structured poem paste', () => {
    const doc = plainTextToRichDocument('S1L1\nS1L2\n\nS2L1\nS2L2\n\nS3L1\nS3L2')
    expect(doc.content.filter((block) => block.type === 'paragraph')).toHaveLength(3)
    expect(richToPlainText(doc)).toContain('S3L2')
  })
})
