import type { Database } from '../database.types.ts'

export type CreationType = Database['public']['Enums']['creation_type']

export type CreationTypeGroupId = 'video_voice' | 'written' | 'collab'

export type CreationTypeMeta = {
  type: CreationType
  name: string
  description: string
  group: CreationTypeGroupId
  /** Spec §17 step 2: core feed and creation (Quote Card + Written Post flows). */
  phase1: boolean
  /** Fraunces writing surface in the editor. */
  literarySurface: boolean
}

const allTypes: CreationType[] = [
  'written_post',
  'poem',
  'story',
  'essay',
  'article',
  'lyric',
  'letter',
  'script',
  'journal',
  'quote_card',
  'book',
  'recitation_video',
  'voice_clip',
  'podcast',
  'course',
  'event',
  'collab',
]

const phase1Set = new Set<CreationType>([
  'quote_card',
  'written_post',
  'poem',
  'story',
  'essay',
  'article',
  'lyric',
  'letter',
  'script',
  'journal',
  'book',
])

const literarySet = new Set<CreationType>([
  'written_post',
  'poem',
  'story',
  'essay',
  'article',
  'lyric',
  'letter',
  'script',
  'journal',
  'quote_card',
  'book',
])

const groupByType: Record<CreationType, CreationTypeGroupId> = {
  recitation_video: 'video_voice',
  voice_clip: 'video_voice',
  podcast: 'video_voice',
  written_post: 'written',
  poem: 'written',
  story: 'written',
  essay: 'written',
  article: 'written',
  lyric: 'written',
  letter: 'written',
  script: 'written',
  journal: 'written',
  quote_card: 'written',
  book: 'written',
  course: 'written',
  collab: 'collab',
  event: 'collab',
}

const labels: Record<CreationType, { name: string; description: string }> = {
  written_post: {
    name: 'Written post',
    description: 'A complete piece with title, body, and tags.',
  },
  poem: { name: 'Poem', description: 'Line breaks and stanza spacing preserved.' },
  story: { name: 'Story', description: 'Fiction or narrative in your own voice.' },
  essay: { name: 'Essay', description: 'Non-fiction with room to develop an idea.' },
  article: { name: 'Article', description: 'Longer-form non-fiction for readers.' },
  lyric: { name: 'Lyric', description: 'Song words and verse, ready to perform.' },
  letter: { name: 'Letter', description: 'A personal or open letter.' },
  script: { name: 'Script', description: 'Dialogue and stage directions.' },
  journal: {
    name: 'Journal / WIP',
    description: 'Notes and work in progress; audience stays private until you publish.',
  },
  quote_card: {
    name: 'Quote card',
    description: 'A short line meant to stand on its own.',
  },
  book: { name: 'Book', description: 'Chapters, cover, and optional price.' },
  recitation_video: { name: 'Recitation video', description: 'Record or import performance video.' },
  voice_clip: { name: 'Voice clip', description: 'Voice-only audio with waveform.' },
  podcast: { name: 'Podcast', description: 'Episodic audio series.' },
  course: { name: 'Course', description: 'Sequenced lessons for learners.' },
  event: { name: 'Event', description: 'A reading, launch, or open mic.' },
  collab: { name: 'Collab post', description: 'Co-create with another writer.' },
}

export const CREATION_TYPE_CARDS: CreationTypeMeta[] = allTypes.map((type) => ({
  type,
  name: labels[type].name,
  description: labels[type].description,
  group: groupByType[type],
  phase1: phase1Set.has(type),
  literarySurface: literarySet.has(type),
}))

export const CREATION_TYPE_GROUPS: { id: CreationTypeGroupId; label: string }[] = [
  { id: 'video_voice', label: 'Video and voice' },
  { id: 'written', label: 'Written' },
  { id: 'collab', label: 'Collab' },
]

export function creationTypesInGroup(group: CreationTypeGroupId): CreationTypeMeta[] {
  return CREATION_TYPE_CARDS.filter((card) => card.group === group)
}

export function parseCreationType(value: string): CreationType | null {
  const normalized = value.trim() as CreationType
  return allTypes.includes(normalized) ? normalized : null
}

export function isPhase1CreationType(type: CreationType): boolean {
  return phase1Set.has(type)
}

export function usesLiterarySurface(type: CreationType): boolean {
  return literarySet.has(type)
}

export const MAX_TITLE_CHARS = 200
