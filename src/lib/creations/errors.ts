import {
  MAX_BODY_JSON_OCTETS,
  MAX_BODY_TEXT_OCTETS,
  MAX_GENRE_MOOD_CHARS,
  MAX_LANGUAGE_CHARS,
  MAX_TAGS_PER_CREATION,
} from './limits.ts'

const TOO_LONG = 'That text is too long. Shorten it and try again.'
const TOO_MANY_TAGS = 'You can add up to 15 tags.'
const SLOW_DOWN = 'You are posting too fast. Slow down and try again.'
const CANT_DELETE = "This can't be deleted right now."

export function messageForCreationWriteError(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? ''
  const lower = msg.toLowerCase()

  if (lower.includes('too fast') || lower.includes('slow down')) return SLOW_DOWN
  if (lower.includes('15 tags')) return TOO_MANY_TAGS
  if (error?.code === '23514' || lower.includes('check constraint')) {
    if (lower.includes('body_text') || lower.includes('body_json')) return TOO_LONG
    if (lower.includes('genre') || lower.includes('mood') || lower.includes('language')) return TOO_LONG
  }
  if (msg.includes(String(MAX_BODY_TEXT_OCTETS)) || msg.includes(String(MAX_BODY_JSON_OCTETS))) return TOO_LONG
  if (msg.includes(String(MAX_GENRE_MOOD_CHARS)) || msg.includes(String(MAX_LANGUAGE_CHARS))) return TOO_LONG
  if (msg.includes(String(MAX_TAGS_PER_CREATION))) return TOO_MANY_TAGS

  return 'We could not save this work. Try again.'
}

export function messageForCreationDeleteError(error: { message?: string; code?: string } | null): string {
  if (!error) return CANT_DELETE
  if (error.code === '42501') return CANT_DELETE
  const msg = error.message ?? ''
  if (msg.toLowerCase().includes('policy')) return CANT_DELETE
  return CANT_DELETE
}

export const creationUserMessages = {
  tooLong: TOO_LONG,
  tooManyTags: TOO_MANY_TAGS,
  slowDown: SLOW_DOWN,
  cantDelete: CANT_DELETE,
} as const
