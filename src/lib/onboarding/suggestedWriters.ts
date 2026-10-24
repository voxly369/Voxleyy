export type SuggestedWriterRow = {
  id: string
  username: string
  displayName: string
  followerCount: number
}

/** Filters out self, already-followed, and blocked writers. */
export function filterSuggestedWriters(
  rows: readonly SuggestedWriterRow[],
  opts: { selfId: string; followingIds: ReadonlySet<string>; blockedIds: ReadonlySet<string> },
): SuggestedWriterRow[] {
  return rows.filter(
    (row) =>
      row.id !== opts.selfId && !opts.followingIds.has(row.id) && !opts.blockedIds.has(row.id) && row.username.length > 0,
  )
}
