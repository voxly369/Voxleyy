import type { ReaderHighlight } from './highlightSchema.ts'

/** Merge remote and queued highlights without dropping any unique id. */
export function mergeHighlightLists(
  remote: readonly ReaderHighlight[],
  local: readonly ReaderHighlight[],
): ReaderHighlight[] {
  const byId = new Map<string, ReaderHighlight>()
  for (const item of remote) byId.set(item.id, item)
  for (const item of local) {
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, item)
      continue
    }
    const existingTime = Date.parse(existing.updatedAt)
    const localTime = Date.parse(item.updatedAt)
    if (localTime >= existingTime) byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export function mergeDeletedHighlightIds(
  remote: readonly ReaderHighlight[],
  deletedIds: readonly string[],
): ReaderHighlight[] {
  if (deletedIds.length === 0) return [...remote]
  const removed = new Set(deletedIds)
  return remote.filter((h) => !removed.has(h.id))
}
