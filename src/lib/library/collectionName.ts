export const COLLECTION_NAME_MIN = 1
export const COLLECTION_NAME_MAX = 60

export function normalizeCollectionName(raw: string): string {
  return raw.trim()
}

export function validateCollectionName(name: string): string | null {
  const trimmed = normalizeCollectionName(name)
  if (trimmed.length < COLLECTION_NAME_MIN) return 'Name is required.'
  if (trimmed.length > COLLECTION_NAME_MAX) return `Use ${COLLECTION_NAME_MAX} characters or fewer.`
  if (/<[^>]+>/.test(trimmed)) return 'HTML is not allowed in collection names.'
  return null
}
