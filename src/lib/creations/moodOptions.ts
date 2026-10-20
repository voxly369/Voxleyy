import { DISCOVER_MOODS } from '../discover/moodsAndGenres.ts'

export const MOOD_OPTIONS = DISCOVER_MOODS

export type CreationMood = (typeof MOOD_OPTIONS)[number]['slug']

const MOOD_SLUGS = new Set<string>(MOOD_OPTIONS.map((m) => m.slug))

export function isCreationMood(value: string | null | undefined): value is CreationMood {
  return typeof value === 'string' && MOOD_SLUGS.has(value)
}
