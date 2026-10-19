const READ_MORE_LIMIT = 280

export function bodyExcerpt(text: string | null | undefined, limit = READ_MORE_LIMIT): { excerpt: string; truncated: boolean } {
  const normalized = (text ?? '').trim()
  if (normalized.length <= limit) return { excerpt: normalized, truncated: false }
  return { excerpt: `${normalized.slice(0, limit).trimEnd()}…`, truncated: true }
}
