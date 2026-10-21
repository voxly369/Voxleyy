import type { Json } from '../database.types.ts'
import { paragraphBlocksFromBody } from './paragraphIndex.ts'

export function paragraphPlainText(bodyJson: Json | null | undefined, bodyText: string | null, paragraphIndex: number): string {
  const blocks = paragraphBlocksFromBody(bodyJson, bodyText)
  const block = blocks[paragraphIndex]
  if (!block) return ''
  return (block.content ?? [])
    .map((node) => (node.type === 'text' ? node.text : node.type === 'hardBreak' ? '\n' : ''))
    .join('')
}

export function allParagraphPlainTexts(bodyJson: Json | null | undefined, bodyText: string | null): string[] {
  return paragraphBlocksFromBody(bodyJson, bodyText).map((block) =>
    (block.content ?? [])
      .map((node) => (node.type === 'text' ? node.text : node.type === 'hardBreak' ? '\n' : ''))
      .join(''),
  )
}

export type TextRange = {
  startParagraph: number
  startChar: number
  endParagraph: number
  endChar: number
}

export function quoteFromRange(
  bodyJson: Json | null | undefined,
  bodyText: string | null,
  range: TextRange,
): string {
  const texts = allParagraphPlainTexts(bodyJson, bodyText)
  if (texts.length === 0) return ''
  const { startParagraph, startChar, endParagraph, endChar } = range
  if (startParagraph === endParagraph) {
    const slice = texts[startParagraph]?.slice(startChar, endChar) ?? ''
    return slice.trim().slice(0, 1000)
  }
  const parts: string[] = []
  for (let p = startParagraph; p <= endParagraph; p += 1) {
    const text = texts[p] ?? ''
    if (p === startParagraph) parts.push(text.slice(startChar))
    else if (p === endParagraph) parts.push(text.slice(0, endChar))
    else parts.push(text)
  }
  return parts.join('\n').trim().slice(0, 1000)
}

export function normalizeRange(range: TextRange, paragraphCount: number): TextRange | null {
  if (paragraphCount <= 0) return null
  const startParagraph = Math.min(paragraphCount - 1, Math.max(0, range.startParagraph))
  const endParagraph = Math.min(paragraphCount - 1, Math.max(0, range.endParagraph))
  const startChar = Math.max(0, range.startChar)
  const endChar = Math.max(0, range.endChar)
  if (startParagraph > endParagraph) return null
  if (startParagraph === endParagraph && startChar > endChar) return null
  return { startParagraph, startChar, endParagraph, endChar }
}
