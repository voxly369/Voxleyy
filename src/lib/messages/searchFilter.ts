import type { ConversationSummary } from './types.ts'

export function filterConversations(
  rows: ConversationSummary[],
  query: string,
): ConversationSummary[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => {
    const name = row.otherDisplayName.toLowerCase()
    const username = row.otherUsername.toLowerCase()
    const preview = (row.preview ?? '').toLowerCase()
    return name.includes(q) || username.includes(q) || preview.includes(q)
  })
}
