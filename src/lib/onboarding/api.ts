import { supabase } from '../supabaseClient.ts'
import type { OnboardingPatch } from './schemas.ts'

export type ProfilePreferencesRow = {
  user_id: string
  onboarding_completed_at: string | null
  onboarding_step: number
  writer_roles: string[]
  favorite_genres: string[]
  languages: string[]
  welcome_moment_seen_at: string | null
  checklist_dismissed_at: string | null
  checklist_progress: Record<string, unknown>
}

function parseRow(data: unknown): ProfilePreferencesRow | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const userId = typeof row.user_id === 'string' ? row.user_id : null
  if (!userId) return null
  return {
    user_id: userId,
    onboarding_completed_at: typeof row.onboarding_completed_at === 'string' ? row.onboarding_completed_at : null,
    onboarding_step: typeof row.onboarding_step === 'number' ? row.onboarding_step : Number(row.onboarding_step) || 0,
    writer_roles: Array.isArray(row.writer_roles) ? row.writer_roles.filter((x): x is string => typeof x === 'string') : [],
    favorite_genres: Array.isArray(row.favorite_genres)
      ? row.favorite_genres.filter((x): x is string => typeof x === 'string')
      : [],
    languages: Array.isArray(row.languages) ? row.languages.filter((x): x is string => typeof x === 'string') : [],
    welcome_moment_seen_at: typeof row.welcome_moment_seen_at === 'string' ? row.welcome_moment_seen_at : null,
    checklist_dismissed_at: typeof row.checklist_dismissed_at === 'string' ? row.checklist_dismissed_at : null,
    checklist_progress:
      row.checklist_progress && typeof row.checklist_progress === 'object'
        ? (row.checklist_progress as Record<string, unknown>)
        : {},
  }
}

export async function fetchMyProfilePreferences(): Promise<
  { ok: true; data: ProfilePreferencesRow } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('get_my_profile_preferences')
  if (error) return { ok: false, message: error.message ?? 'Could not load preferences.' }
  const parsed = parseRow(data)
  if (!parsed) return { ok: false, message: 'Could not read preferences.' }
  return { ok: true, data: parsed }
}

export async function patchMyProfilePreferences(
  patch: OnboardingPatch & {
    onboarding_completed_at?: string | null
    checklist_dismissed_at?: string | null
  },
): Promise<{ ok: true; data: ProfilePreferencesRow } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('upsert_my_profile_preferences', { p_patch: patch })
  if (error) return { ok: false, message: error.message ?? 'Could not save progress.' }
  const parsed = parseRow(data)
  if (!parsed) return { ok: false, message: 'Could not read saved preferences.' }
  return { ok: true, data: parsed }
}

export async function completeMyOnboarding(
  country: string | null,
  timezone: string | null,
): Promise<{ ok: true; data: ProfilePreferencesRow } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('complete_my_onboarding', {
    p_country: country,
    p_timezone: timezone,
  })
  if (error) return { ok: false, message: error.message ?? 'Could not finish onboarding.' }
  const parsed = parseRow(data)
  if (!parsed) return { ok: false, message: 'Could not read preferences.' }
  return { ok: true, data: parsed }
}

export async function reopenOnboarding(): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await patchMyProfilePreferences({
    onboarding_step: 0,
    onboarding_completed_at: null,
  })
  if (!result.ok) return result
  return { ok: true }
}
