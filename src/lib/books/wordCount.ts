import type { Json } from '../database.types.ts'
import { bodyTextFromJson } from '../creations/bodyDocument.ts'

const WORD_RE = /[\p{L}\p{N}']+/gu

export function countWordsInPlainText(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const matches = trimmed.match(WORD_RE)
  return matches?.length ?? 0
}

export function countWordsInChapterBody(bodyText: string | null | undefined, bodyJson: Json | null | undefined): number {
  const fromText = bodyText?.trim()
  if (fromText) return countWordsInPlainText(fromText)
  if (bodyJson) {
    const derived = bodyTextFromJson(bodyJson)
    if (derived.trim()) return countWordsInPlainText(derived)
  }
  return 0
}
