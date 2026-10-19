import type { Editor } from '@tiptap/react'
import {
  docToEditorJson,
  editorJsonToDoc,
  normalizePlainTextForRich,
  plainToRich,
  validateRichDocumentSize,
  type RichBodyDocument,
} from './richDocument.ts'

export const PASTE_TOO_LONG_MESSAGE = 'That text is too long. Shorten it and try again.'

export const PASTE_UNREADABLE_MESSAGE = 'We could not paste into this text. Undo and try again.'

export function plainTextToRichDocument(text: string): RichBodyDocument {
  return plainToRich(normalizePlainTextForRich(text))
}

function mergeDocuments(current: RichBodyDocument, pasted: RichBodyDocument, inHeading: boolean): RichBodyDocument {
  if (inHeading) {
    const heading = current.content.find((b) => b.type === 'heading')
    const pasteInlines = pasted.content.flatMap((block) => (block.type === 'paragraph' || block.type === 'heading' ? (block.content ?? []) : []))
    if (heading && heading.type === 'heading') {
      return {
        ...current,
        content: current.content.map((block) =>
          block.type === 'heading'
            ? { ...block, content: [...(block.content ?? []), ...pasteInlines] }
            : block,
        ),
      }
    }
    return { ...current, content: [{ type: 'paragraph', content: pasteInlines }] }
  }

  const merged: RichBodyDocument = {
    version: 1,
    format: 'rich',
    content: [...current.content, ...pasted.content],
  }
  if (merged.content.length === 0) merged.content.push({ type: 'paragraph' })
  return merged
}

/** Insert normalised plain text at the cursor; returns false if refused (too long). */
export function pastePlainTextIntoEditor(editor: Editor, rawText: string): { ok: true } | { ok: false; message: string } {
  const pasted = plainTextToRichDocument(rawText)
  const currentJson = editor.getJSON()
  const currentDoc = editorJsonToDoc(currentJson)
  if (!currentDoc) return { ok: false, message: PASTE_UNREADABLE_MESSAGE }

  const inHeading = editor.isActive('heading')
  const merged = mergeDocuments(currentDoc, pasted, inHeading)
  const size = validateRichDocumentSize(merged)
  if (!size.ok) return { ok: false, message: size.message }

  if (inHeading) {
    const inlines = pasted.content.flatMap((block) =>
      block.type === 'paragraph' || block.type === 'heading' ? (block.content ?? []) : [],
    )
    const content = inlines.map((inline) => {
      if (inline.type === 'hardBreak') return { type: 'hardBreak' as const }
      const marks = (inline.marks ?? []).map((m) => ({ type: m }))
      return marks.length
        ? { type: 'text' as const, text: inline.text, marks }
        : { type: 'text' as const, text: inline.text }
    })
    editor.chain().focus().insertContent(content).run()
    return { ok: true }
  }

  const insertDoc = docToEditorJson(pasted)
  editor.chain().focus().insertContent(insertDoc.content ?? []).run()
  return { ok: true }
}
