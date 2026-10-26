import type { CreationType } from '../lib/creations/creationTypes.ts'

/** When false, unbuilt create flows stay in code but are hidden from pickers. */
export const SHOW_UNBUILT_CREATE_OPTIONS = false

/** When false, the For You feed tab is hidden (no “Coming soon” surface). */
export const SHOW_FOR_YOU_FEED_TAB = false

/** Create sheet types that are wired for launch (section 23). */
export const BUILT_CREATE_PICKER_TYPES: readonly CreationType[] = [
  'written_post',
  'book',
  'quote_card',
  'journal',
] as const

/** Types kept behind SHOW_UNBUILT_CREATE_OPTIONS (video, voice, collab, course, event, etc.). */
export const UNBUILT_CREATE_TYPES: readonly CreationType[] = [
  'recitation_video',
  'voice_clip',
  'podcast',
  'collab',
  'course',
  'event',
  'poem',
  'story',
  'essay',
  'article',
  'lyric',
  'letter',
  'script',
] as const

export function isVisibleInCreatePicker(type: CreationType): boolean {
  if (BUILT_CREATE_PICKER_TYPES.includes(type as (typeof BUILT_CREATE_PICKER_TYPES)[number])) return true
  if (!SHOW_UNBUILT_CREATE_OPTIONS) return false
  return UNBUILT_CREATE_TYPES.includes(type as (typeof UNBUILT_CREATE_TYPES)[number])
}
