import { MAX_CAPTION_CHARS, MAX_QUOTE_LINE_CHARS } from './limits.ts'
import { contrastRatio } from './quoteCardContrast.ts'
import type { QuoteCardStyle } from './bodyDocument.ts'

export type PublishCheckInput = {
  title: string
  body: string
  caption?: string
  creationType?: string
  quoteStyle?: QuoteCardStyle
}

export type PublishCheckResult = { ok: true } | { ok: false; message: string }

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function nonEmptyBodyLines(body: string): number {
  return body.split('\n').filter((line) => line.trim().length > 0).length
}

export function validatePublishContent(input: PublishCheckInput): PublishCheckResult {
  const caption = input.caption?.trim() ?? ''
  if (caption.length > MAX_CAPTION_CHARS) {
    return { ok: false, message: 'Caption is too long.' }
  }

  if (input.creationType === 'quote_card') {
    const line = input.body.trim()
    if (!line) return { ok: false, message: 'Add your quote line before you publish.' }
    if (line.length > MAX_QUOTE_LINE_CHARS) {
      return { ok: false, message: 'Quote lines can be up to 400 characters.' }
    }
    const style = input.quoteStyle
    if (style) {
      const ratio = contrastRatio(style.color, style.background)
      if (ratio < 3) {
        return { ok: false, message: 'Choose colours with more contrast so readers can read your quote.' }
      }
    }
    return { ok: true }
  }

  if (!input.title.trim()) {
    return { ok: false, message: 'Add a title before you publish.' }
  }
  if (nonEmptyBodyLines(input.body) < 1) {
    return { ok: false, message: 'Add at least one line of writing before you publish.' }
  }
  return { ok: true }
}

export function publishContentStats(body: string) {
  return {
    words: countWords(body),
    lines: body.split('\n').length,
    characters: body.length,
  }
}

export function quoteContrastWarning(style: QuoteCardStyle): string | null {
  const ratio = contrastRatio(style.color, style.background)
  if (ratio < 4.5) return 'These colours may be hard to read. Consider higher contrast.'
  return null
}
