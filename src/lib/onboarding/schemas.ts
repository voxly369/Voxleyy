import { z } from 'zod'
import { DISCOVER_GENRES } from '../discover/moodsAndGenres.ts'

const genreSlugSet = new Set(DISCOVER_GENRES.map((g) => g.slug))

export const onboardingRolesSchema = z.array(z.string()).max(6)

export const onboardingGenresSchema = z
  .array(z.string())
  .max(12)
  .refine((arr) => arr.every((g) => genreSlugSet.has(g as (typeof DISCOVER_GENRES)[number]['slug'])), 'Invalid genre.')

export const onboardingLanguagesSchema = z.array(z.string().min(2).max(8)).max(10)

export type OnboardingPatch = {
  onboarding_step?: number
  writer_roles?: string[]
  favorite_genres?: string[]
  languages?: string[]
  welcome_moment_seen_at?: string
  last_entrance_local_date?: string
  show_entrance_screen?: boolean
  checklist_progress?: Record<string, boolean>
}
