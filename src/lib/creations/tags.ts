import { CREATION_TAG_PATTERN, MAX_TAGS_PER_CREATION } from './limits.ts'

export function normalizeTagInput(raw: string): string | null {
  const tag = raw.trim().toLowerCase().replace(/^#/, '')
  if (!tag) return null
  if (!CREATION_TAG_PATTERN.test(tag)) return null
  return tag
}

export function addTag(list: string[], raw: string): { tags: string[]; error: string | null } {
  const tag = normalizeTagInput(raw)
  if (!tag) return { tags: list, error: 'Use lowercase letters, numbers, and underscores.' }
  if (list.includes(tag)) return { tags: list, error: null }
  if (list.length >= MAX_TAGS_PER_CREATION) {
    return { tags: list, error: 'You can add up to 15 tags.' }
  }
  return { tags: [...list, tag], error: null }
}

export function removeTag(list: string[], tag: string): string[] {
  return list.filter((entry) => entry !== tag)
}

export function parseTagInput(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((part) => normalizeTagInput(part))
    .filter((tag): tag is string => Boolean(tag))
}
