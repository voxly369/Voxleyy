import type { DiscoverFilterParams } from './filterParams.ts'
import { genreSlugToCreationType } from './filterParams.ts'

export type DiscoverListKind =
  | 'trending'
  | 'new'
  | 'top_week_poem'
  | 'top_week_story'
  | 'filtered'

export function discoverTableForKind(kind: DiscoverListKind, filters: DiscoverFilterParams): string {
  if (kind === 'trending' || filters.sort === 'trending') return 'discover_trending_creations'
  if (kind === 'top_week_poem' || kind === 'top_week_story') return 'discover_top_week_creations'
  return 'discover_new_creations'
}

export function discoverOrderColumn(table: string): { column: string; ascending: boolean } {
  if (table === 'discover_trending_creations') return { column: 'engagement_score', ascending: false }
  if (table === 'discover_top_week_creations') return { column: 'like_count', ascending: false }
  return { column: 'published_at', ascending: false }
}

export function applyDiscoverFiltersToQuery(
  filters: DiscoverFilterParams,
  kind: DiscoverListKind,
): { mood?: string; genre?: string; languages?: string[]; country?: string; type?: string } {
  const out: { mood?: string; genre?: string; languages?: string[]; country?: string; type?: string } = {}
  if (filters.mood) out.mood = filters.mood
  if (filters.genre) {
    out.genre = filters.genre
    const type = genreSlugToCreationType(filters.genre)
    if (type) out.type = type
  }
  const languages = filters.languages?.length ? filters.languages : filters.language ? [filters.language] : []
  if (languages.length > 0) out.languages = languages
  if (filters.country) out.country = filters.country
  if (kind === 'top_week_poem') out.type = 'poem'
  if (kind === 'top_week_story') out.type = 'story'
  return out
}
