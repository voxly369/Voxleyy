export function wholeLineExcerpt(text: string, maxLines: number): { text: string; truncated: boolean } {
  const unified = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = unified.split('\n')
  if (lines.length <= maxLines) {
    return { text: unified, truncated: false }
  }
  return { text: `${lines.slice(0, maxLines).join('\n')}…`, truncated: true }
}
