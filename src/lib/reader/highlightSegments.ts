import type { HighlightColour } from './highlightSchema.ts'
import type { AnchoredHighlight } from './highlightAnchoring.ts'

export type HighlightSegment = {
  text: string
  highlightId?: string
  colour?: HighlightColour
}

export function segmentsForParagraph(
  paragraphIndex: number,
  plainText: string,
  highlights: readonly AnchoredHighlight[],
): HighlightSegment[] {
  const ranges: Array<{ start: number; end: number; id: string; colour: HighlightColour }> = []
  for (const highlight of highlights) {
    if (highlight.unmatched) continue
    if (paragraphIndex < highlight.startParagraph || paragraphIndex > highlight.endParagraph) continue
    const start =
      paragraphIndex === highlight.startParagraph ? highlight.startChar : 0
    const end =
      paragraphIndex === highlight.endParagraph ? highlight.endChar : plainText.length
    if (end > start) {
      ranges.push({ start, end, id: highlight.id, colour: highlight.colour })
    }
  }
  ranges.sort((a, b) => a.start - b.start)
  const merged: typeof ranges = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (!last || range.start >= last.end) merged.push({ ...range })
    else if (range.end > last.end) last.end = range.end
  }
  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: plainText.slice(cursor, range.start) })
    }
    segments.push({
      text: plainText.slice(range.start, range.end),
      highlightId: range.id,
      colour: range.colour,
    })
    cursor = range.end
  }
  if (cursor < plainText.length) segments.push({ text: plainText.slice(cursor) })
  if (segments.length === 0) segments.push({ text: plainText })
  return segments
}

export function highlightColourClasses(colour: HighlightColour): string {
  switch (colour) {
    case 'green':
      return 'bg-emerald-200/80 underline decoration-emerald-700'
    case 'blue':
      return 'bg-sky-200/80 underline decoration-sky-800'
    case 'pink':
      return 'bg-pink-200/80 underline decoration-pink-800'
    case 'orange':
      return 'bg-orange-200/80 underline decoration-orange-800'
    default:
      return 'bg-yellow-200/80 underline decoration-yellow-800'
  }
}
