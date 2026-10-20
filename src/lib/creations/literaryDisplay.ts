import type { RichBodyDocument, RichInline } from './richDocument.ts'
import { parseRichDocument, richToPlainText } from './richDocument.ts'
import type { Json } from '../database.types.ts'
import { bodyTextFromJson } from './bodyDocument.ts'

function inlineToLine(inlines: RichInline[] | undefined): string {
  if (!inlines?.length) return ''
  return inlines
    .map((node) => {
      if (node.type === 'hardBreak') return '\n'
      return node.text
    })
    .join('')
}

/** One stored rich paragraph becomes one logical line (paragraph-per-line legacy included). */
export function literaryLinesFromRich(doc: RichBodyDocument): string[] {
  return doc.content.map((block) => {
    if (block.type === 'heading') return inlineToLine(block.content)
    return inlineToLine(block.content)
  })
}

export function trimLiteraryLines(lines: readonly string[]): string[] {
  const copy = [...lines]
  while (copy.length > 0 && copy[0].trim() === '') copy.shift()
  while (copy.length > 0 && copy[copy.length - 1].trim() === '') copy.pop()
  return copy
}

export function literaryLinesFromBody(bodyJson: Json | null | undefined, bodyText: string | null): string[] {
  const rich = parseRichDocument(bodyJson)
  if (rich) return trimLiteraryLines(literaryLinesFromRich(rich))
  const text = bodyText ?? bodyTextFromJson(bodyJson, bodyText)
  const unified = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return trimLiteraryLines(unified.split('\n'))
}

export function literaryStanzasFromLines(lines: readonly string[]): string[][] {
  const stanzas: string[][] = []
  let current: string[] = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        stanzas.push(current)
        current = []
      }
      continue
    }
    current.push(line)
  }
  if (current.length > 0) stanzas.push(current)
  return stanzas
}

export function trimLiteraryPlainText(text: string): string {
  return trimLiteraryLines(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')).join('\n')
}

export function trimLiteraryRichDocument(doc: RichBodyDocument): RichBodyDocument {
  const lines = trimLiteraryLines(literaryLinesFromRich(doc))
  if (lines.length === 0) {
    return { version: 1, format: 'rich', content: [{ type: 'paragraph' }] }
  }
  const content = lines.map((line) => {
    if (line === '') return { type: 'paragraph' as const, content: undefined }
    const parts = line.split('\n')
    const inlines: RichInline[] = []
    parts.forEach((part, index) => {
      if (part) inlines.push({ type: 'text', text: part })
      if (index < parts.length - 1) inlines.push({ type: 'hardBreak' })
    })
    return { type: 'paragraph' as const, content: inlines.length ? inlines : undefined }
  })
  return { version: 1, format: 'rich', content }
}

export function literaryPlainFromRich(doc: RichBodyDocument): string {
  return trimLiteraryLines(literaryLinesFromRich(doc)).join('\n')
}

/** Plain export for non-literary rich remains double-newline separated. */
export function plainTextFromRich(doc: RichBodyDocument, literary: boolean): string {
  return literary ? literaryPlainFromRich(doc) : richToPlainText(doc)
}
