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

const SHORT_POETRY_LINE_MAX = 55

function isShortPoetryLine(block: string): boolean {
  const trimmed = block.trim()
  return trimmed.length > 0 && trimmed.length <= SHORT_POETRY_LINE_MAX && !trimmed.includes('\n')
}

/** Double-newline blocks are stanza breaks for line-based poems, not for prose paragraphs. */
function plainBlocksUseStanzaBreaks(blocks: readonly string[]): boolean {
  const nonEmpty = blocks.map((block) => block.trim()).filter(Boolean)
  if (nonEmpty.length <= 1) return false
  const shortLines = nonEmpty.filter(isShortPoetryLine).length
  return shortLines >= nonEmpty.length * 0.6
}

/** Plain text for cards when body_json is unavailable (feed excerpts). */
export function literaryLinesFromPlainText(text: string): string[] {
  const unified = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = unified.split(/\n\n+/)
  if (blocks.length === 1) {
    return trimLiteraryLines(unified.split('\n'))
  }
  const hasMultilineBlock = blocks.some((block) => block.includes('\n'))
  const useStanzaBreaks = hasMultilineBlock || plainBlocksUseStanzaBreaks(blocks)
  if (!useStanzaBreaks) {
    const lines: string[] = []
    for (const block of blocks) {
      const trimmed = block.trim()
      if (!trimmed) continue
      lines.push(...trimmed.split('\n'))
    }
    return trimLiteraryLines(lines)
  }
  const lines: string[] = []
  blocks.forEach((block, index) => {
    lines.push(...block.split('\n'))
    if (index < blocks.length - 1) lines.push('')
  })
  return trimLiteraryLines(lines)
}

export function literaryLinesFromBody(bodyJson: Json | null | undefined, bodyText: string | null): string[] {
  const rich = parseRichDocument(bodyJson)
  if (rich) return trimLiteraryLines(literaryLinesFromRich(rich))
  const text = bodyText ?? bodyTextFromJson(bodyJson, bodyText)
  return literaryLinesFromPlainText(text)
}

export function collapseConsecutiveBlankLiteraryLines(lines: readonly string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      continue
    }
    out.push(line)
  }
  return trimLiteraryLines(out)
}

export function literaryPreviewExcerpt(
  bodyJson: Json | null | undefined,
  bodyText: string | null,
  maxLines: number,
): { lines: string[]; truncated: boolean } {
  const lines = collapseConsecutiveBlankLiteraryLines(literaryLinesFromBody(bodyJson, bodyText))
  if (lines.length <= maxLines) return { lines, truncated: false }
  return { lines: lines.slice(0, maxLines), truncated: true }
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
