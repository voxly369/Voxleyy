import { collapseConsecutiveBlankLiteraryLines, literaryLinesFromPlainText } from './literaryDisplay.ts'

export function wholeLineExcerpt(text: string, maxLines: number): { text: string; truncated: boolean } {
  const lines = collapseConsecutiveBlankLiteraryLines(literaryLinesFromPlainText(text))
  if (lines.length <= maxLines) {
    return { text: lines.join('\n'), truncated: false }
  }
  return { text: `${lines.slice(0, maxLines).join('\n')}…`, truncated: true }
}
