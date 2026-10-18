import {
  CREATION_TAG_PATTERN,
  MAX_BODY_JSON_OCTETS,
  MAX_BODY_TEXT_OCTETS,
  MAX_GENRE_MOOD_CHARS,
  MAX_LANGUAGE_CHARS,
  MAX_TAGS_PER_CREATION,
} from './limits.ts'

export type CreationFieldInput = {
  body_text?: string | null
  body_json?: unknown
  genre?: string | null
  mood?: string | null
  language?: string
  tags?: string[]
}

export type ValidationIssue = { code: 'too_long' | 'too_many_tags' | 'invalid_tag'; message: string }

function octetLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function bodyJsonOctets(value: unknown): number {
  if (value === null || value === undefined) return 0
  return octetLength(JSON.stringify(value))
}

export function validateCreationFields(input: CreationFieldInput): ValidationIssue | null {
  if (input.body_text != null && octetLength(input.body_text) > MAX_BODY_TEXT_OCTETS) {
    return { code: 'too_long', message: 'That text is too long. Shorten it and try again.' }
  }
  if (input.body_json !== undefined && bodyJsonOctets(input.body_json) > MAX_BODY_JSON_OCTETS) {
    return { code: 'too_long', message: 'That text is too long. Shorten it and try again.' }
  }
  if (input.genre != null && input.genre.length > MAX_GENRE_MOOD_CHARS) {
    return { code: 'too_long', message: 'Genre is too long.' }
  }
  if (input.mood != null && input.mood.length > MAX_GENRE_MOOD_CHARS) {
    return { code: 'too_long', message: 'Mood is too long.' }
  }
  if (input.language != null && input.language.length > MAX_LANGUAGE_CHARS) {
    return { code: 'too_long', message: 'Language code is too long.' }
  }
  if (input.tags) {
    if (input.tags.length > MAX_TAGS_PER_CREATION) {
      return { code: 'too_many_tags', message: 'You can add up to 15 tags.' }
    }
    for (const tag of input.tags) {
      if (!CREATION_TAG_PATTERN.test(tag)) {
        return { code: 'invalid_tag', message: 'Use lowercase letters, numbers, and underscores in tags.' }
      }
    }
  }
  return null
}
