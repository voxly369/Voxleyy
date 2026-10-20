import { DISCOVER_GENRES, DISCOVER_MOODS, type DiscoverGenreSlug, type DiscoverMoodSlug } from './moodsAndGenres.ts'

export type DiscoverSort = 'trending' | 'new'

export type DiscoverFilterParams = {
  mood?: DiscoverMoodSlug
  genre?: DiscoverGenreSlug
  language?: string
  country?: string
  sort?: DiscoverSort
}

const MOOD_SET = new Set(DISCOVER_MOODS.map((m) => m.slug))
const GENRE_SET = new Set(DISCOVER_GENRES.map((g) => g.slug))

export function parseDiscoverFilters(search: URLSearchParams): DiscoverFilterParams {
  const mood = search.get('mood')
  const genre = search.get('genre')
  const language = search.get('language')
  const country = search.get('country')
  const sort = search.get('sort')
  const out: DiscoverFilterParams = {}
  if (mood && MOOD_SET.has(mood as DiscoverMoodSlug)) out.mood = mood as DiscoverMoodSlug
  if (genre && GENRE_SET.has(genre as DiscoverGenreSlug)) out.genre = genre as DiscoverGenreSlug
  if (language && /^[a-z]{2}$/i.test(language)) out.language = language.toLowerCase()
  if (country && /^[A-Z]{2}$/.test(country)) out.country = country
  if (sort === 'trending' || sort === 'new') out.sort = sort
  return out
}

export function discoverFiltersToSearchParams(filters: DiscoverFilterParams): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.mood) params.set('mood', filters.mood)
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.language) params.set('language', filters.language)
  if (filters.country) params.set('country', filters.country)
  if (filters.sort) params.set('sort', filters.sort)
  return params
}

export function genreSlugToCreationType(slug: DiscoverGenreSlug): string | undefined {
  return DISCOVER_GENRES.find((g) => g.slug === slug)?.type
}
