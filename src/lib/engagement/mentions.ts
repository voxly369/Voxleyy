/** Match @handles not preceded by email/local-part characters (aligned with SQL mention sync). */
const MENTION_PATTERN = /(?:^|[^a-z0-9_@])@([a-z0-9_]{3,30})(?![a-z0-9_])/gi

/** Returns unique @username tokens (without the @), lowercase. */
export function parseMentions(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const username = match[1]?.toLowerCase()
    if (username) found.add(username)
  }
  return [...found]
}

export type MentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; value: string; username: string }

/** Split comment text into plain text and mention tokens for safe rendering. */
export function segmentMentionText(text: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, index) })
    }
    const username = match[1]?.toLowerCase() ?? ''
    segments.push({ kind: 'mention', value: `@${username}`, username })
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) })
  }
  return segments
}
