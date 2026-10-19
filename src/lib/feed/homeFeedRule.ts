/**
 * Home feed rule (SPEC §4, Prompt 6): a continuous scroll of published **public** work
 * from **active** authors the viewer is not blocked from, ordered newest first.
 * Posts from followed writers are included because they are part of that same public set;
 * this step does not apply a separate ranking or suggestion bucket (For You does later).
 */
export function homeFeedIsAllEligiblePublicCreations(): true {
  return true
}

/** Following feed: only creators the viewer follows (still must pass feed_creations / RLS). */
export function followingFeedIncludesAuthor(followeeIds: ReadonlySet<string>, authorId: string): boolean {
  return followeeIds.has(authorId)
}
