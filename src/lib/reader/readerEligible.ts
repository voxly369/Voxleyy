import type { CreationType } from '../creations/creationTypes.ts'

/** Long-form written types that open in the Kindle-style reader (Prompt 10A). */
export const READER_ELIGIBLE_TYPES = new Set<CreationType>([
  'written_post',
  'story',
  'essay',
  'article',
  'letter',
])

export function isReaderEligibleType(type: CreationType): boolean {
  return READER_ELIGIBLE_TYPES.has(type)
}
