import type { Json } from '../database.types.ts'

/** Plain-text editor snapshot stored alongside body_text for future rich-text (spec §3, §5). */
export type PlainBodyDocument = {
  version: 1
  format: 'plain'
  text: string
}

export function bodyTextFromJson(value: Json | null | undefined): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const record = value as Record<string, unknown>
  if (record.version === 1 && record.format === 'plain' && typeof record.text === 'string') {
    return record.text
  }
  return ''
}

export function bodyDocumentFromText(text: string): PlainBodyDocument {
  return { version: 1, format: 'plain', text }
}

export function bodyJsonFromText(text: string): PlainBodyDocument {
  return bodyDocumentFromText(text)
}

export function countLines(text: string): number {
  if (!text) return 0
  return text.split('\n').length
}

export function bodyOctets(text: string): number {
  return new TextEncoder().encode(text).length
}

export function hasEditorContent(title: string, body: string, tags: string[]): boolean {
  return Boolean(title.trim() || body.trim() || tags.length > 0)
}
