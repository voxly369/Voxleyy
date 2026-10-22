const DEFAULT_PREVIEW_MAX = 120

/** Single-line conversation list preview (matches server list_my_conversations). */
export function truncateConversationPreview(text: string | null | undefined, max = DEFAULT_PREVIEW_MAX): string {
  if (!text) return ''
  const singleLine = text.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= max) return singleLine
  return `${singleLine.slice(0, max - 1)}…`
}
