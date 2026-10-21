import type { Json } from '../database.types.ts'
import { allParagraphPlainTexts, type TextRange } from './highlightOffsets.ts'
import type { ReaderHighlight } from './highlightSchema.ts'

export type AnchoredHighlight = ReaderHighlight & { unmatched?: boolean }

function findQuoteInParagraph(text: string, quote: string): { start: number; end: number } | null {
  const trimmed = quote.trim()
  if (!trimmed) return null
  const idx = text.indexOf(trimmed)
  if (idx >= 0) return { start: idx, end: idx + trimmed.length }
  const firstWords = trimmed.split(/\s+/).slice(0, 6).join(' ')
  if (firstWords.length >= 8) {
    const fuzzy = text.indexOf(firstWords)
    if (fuzzy >= 0) return { start: fuzzy, end: Math.min(text.length, fuzzy + trimmed.length) }
  }
  return null
}

export function reanchorHighlight(
  highlight: Omit<ReaderHighlight, 'unmatched'>,
  bodyJson: Json | null | undefined,
  bodyText: string | null,
): AnchoredHighlight {
  const texts = allParagraphPlainTexts(bodyJson, bodyText)
  if (texts.length === 0) return { ...highlight, unmatched: true }

  const exactParagraph = texts[highlight.startParagraph]
  if (exactParagraph) {
    const slice = exactParagraph.slice(highlight.startChar, highlight.endChar)
    if (slice === highlight.quote || exactParagraph.includes(highlight.quote.trim())) {
      return { ...highlight, unmatched: false }
    }
  }

  for (let p = 0; p < texts.length; p += 1) {
    const hit = findQuoteInParagraph(texts[p] ?? '', highlight.quote)
    if (hit) {
      return {
        ...highlight,
        startParagraph: p,
        startChar: hit.start,
        endParagraph: p,
        endChar: hit.end,
        unmatched: false,
      }
    }
  }

  let bestParagraph = highlight.startParagraph
  let bestScore = -1
  const needle = highlight.quote.trim().toLowerCase().slice(0, 40)
  texts.forEach((text, index) => {
    const score = needle ? (text.toLowerCase().includes(needle) ? needle.length : 0) : 0
    if (score > bestScore) {
      bestScore = score
      bestParagraph = index
    }
  })

  if (bestScore > 0) {
    const hit = findQuoteInParagraph(texts[bestParagraph] ?? '', highlight.quote)
    if (hit) {
      return {
        ...highlight,
        startParagraph: bestParagraph,
        startChar: hit.start,
        endParagraph: bestParagraph,
        endChar: hit.end,
        unmatched: false,
      }
    }
  }

  return { ...highlight, unmatched: true }
}

export function reanchorHighlights(
  highlights: readonly ReaderHighlight[],
  bodyJson: Json | null | undefined,
  bodyText: string | null,
): AnchoredHighlight[] {
  return highlights.map((h) => reanchorHighlight(h, bodyJson, bodyText))
}

export function rangeFromSelection(
  root: HTMLElement,
  selection: Selection,
  paragraphCount: number,
): TextRange | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  const startAnchor = findParagraphAnchor(range.startContainer, root)
  const endAnchor = findParagraphAnchor(range.endContainer, root)
  if (!startAnchor || !endAnchor) return null

  const startParagraph = Number(startAnchor.dataset.readerParagraphIndex ?? -1)
  const endParagraph = Number(endAnchor.dataset.readerParagraphIndex ?? -1)
  if (startParagraph < 0 || endParagraph < 0) return null

  const startChar = charOffsetInParagraph(startAnchor, range.startContainer, range.startOffset)
  const endChar = charOffsetInParagraph(endAnchor, range.endContainer, range.endOffset)
  const normalized = {
    startParagraph,
    startChar,
    endParagraph,
    endChar,
  }
  if (normalized.startParagraph > normalized.endParagraph) return null
  if (
    normalized.startParagraph === normalized.endParagraph &&
    normalized.startChar >= normalized.endChar
  ) {
    return null
  }
  if (paragraphCount > 0 && normalized.endParagraph >= paragraphCount) return null
  return normalized
}

function findParagraphAnchor(node: Node, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.readerParagraphIndex != null) {
      return current
    }
    current = current.parentNode
  }
  return null
}

function charOffsetInParagraph(paragraph: HTMLElement, container: Node, offset: number): number {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
  let total = 0
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node === container) return total + offset
    total += node.textContent?.length ?? 0
    node = walker.nextNode()
  }
  return total
}
