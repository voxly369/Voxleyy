const MIN_SEARCH = 2
const MAX_SEARCH = 80

const UNSAFE_PATTERN = /[\\%_''&|!():*<>]/g

export function sanitizeSearchInput(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  const stripped = trimmed.replace(UNSAFE_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return stripped.slice(0, MAX_SEARCH)
}

export function isSearchQueryReady(raw: string): boolean {
  return sanitizeSearchInput(raw).length >= MIN_SEARCH
}

export const SEARCH_INPUT_LIMITS = { min: MIN_SEARCH, max: MAX_SEARCH } as const
