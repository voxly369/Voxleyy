import { editorJsonToDoc, richToPlainText, type RichBodyDocument } from './bodyDocument.ts'

export type EditorUpdateResult =
  | { ok: true; doc: RichBodyDocument; plain: string }
  | { ok: false; revertTo: RichBodyDocument }

export function processEditorJsonUpdate(json: unknown, lastValid: RichBodyDocument): EditorUpdateResult {
  const parsed = editorJsonToDoc(json)
  if (!parsed) return { ok: false, revertTo: lastValid }
  return { ok: true, doc: parsed, plain: richToPlainText(parsed) }
}
