import type { CreationType } from '../creations/creationTypes.ts'
import type { LibraryItem } from './types.ts'

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function mapLibraryItemRow(row: Record<string, unknown>): LibraryItem | null {
  const creationId = text(row.creation_id)
  if (!creationId) return null
  const typeRaw = row.type
  const authorId = text(row.author_id)
  const username = text(row.author_username)
  const author =
    username != null && authorId != null
      ? {
          id: authorId,
          username,
          displayName: text(row.author_display_name) ?? '',
          avatarUrl: text(row.author_avatar_url),
          verified: row.author_verified === true,
        }
      : null

  return {
    creationId,
    isAvailable: row.is_available === true,
    type: typeof typeRaw === 'string' ? (typeRaw as CreationType) : null,
    title: text(row.title),
    caption: text(row.caption),
    bodyExcerpt: text(row.body_excerpt),
    bodyTruncated: row.body_truncated === true,
    coverUrl: text(row.cover_url),
    publishedAt: text(row.published_at),
    author,
    savedAt: text(row.saved_at) ?? undefined,
    percent: typeof row.percent === 'number' ? row.percent : undefined,
    position: typeof row.position === 'number' ? row.position : undefined,
    completed: row.completed === true,
    updatedAt: text(row.updated_at) ?? undefined,
  }
}
