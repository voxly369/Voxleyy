import { describe, expect, it, vi } from 'vitest'
import * as bodyDocument from './bodyDocument.ts'
import { emptyRichDocument } from './bodyDocument.ts'
import { processEditorJsonUpdate } from './richEditorUpdate.ts'

describe('processEditorJsonUpdate', () => {
  it('returns revert when editorJsonToDoc fails', () => {
    vi.spyOn(bodyDocument, 'editorJsonToDoc').mockReturnValue(null)
    const last = emptyRichDocument()
    const result = processEditorJsonUpdate({ type: 'doc' }, last)
    expect(result).toEqual({ ok: false, revertTo: last })
    vi.restoreAllMocks()
  })

  it('returns parsed doc when editorJsonToDoc succeeds', () => {
    const doc = {
      version: 1 as const,
      format: 'rich' as const,
      content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text: 'Hi' }] }],
    }
    vi.spyOn(bodyDocument, 'editorJsonToDoc').mockReturnValue(doc)
    const result = processEditorJsonUpdate({ type: 'doc' }, emptyRichDocument())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.plain).toBe('Hi')
    vi.restoreAllMocks()
  })
})
