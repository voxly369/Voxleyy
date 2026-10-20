export const DISCOVER_MOODS = [
  { slug: 'heartbreak', label: 'Heartbreak' },
  { slug: 'motivation', label: 'Motivation' },
  { slug: 'humor', label: 'Humor' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'romance', label: 'Romance' },
  { slug: 'reflection', label: 'Reflection' },
  { slug: 'anger', label: 'Anger' },
  { slug: 'hope', label: 'Hope' },
] as const

export type DiscoverMoodSlug = (typeof DISCOVER_MOODS)[number]['slug']

export const DISCOVER_GENRES = [
  { slug: 'poetry', label: 'Poetry', type: 'poem' as const },
  { slug: 'fiction', label: 'Fiction', type: 'story' as const },
  { slug: 'essays', label: 'Essays', type: 'essay' as const },
  { slug: 'scripts', label: 'Scripts', type: 'script' as const },
  { slug: 'lyrics', label: 'Lyrics', type: 'lyric' as const },
  { slug: 'journaling', label: 'Journaling', type: 'journal' as const },
  { slug: 'letters', label: 'Letters', type: 'letter' as const },
] as const

export type DiscoverGenreSlug = (typeof DISCOVER_GENRES)[number]['slug']
