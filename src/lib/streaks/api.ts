import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import type { StreakSnapshot } from './liveCurrentStreak.ts'

export type StreakFailure = {
  ok: false
  error: {
    code: 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type StreakResult<T> = { ok: true; data: T } | StreakFailure

export type UserStreaks = {
  writing: StreakSnapshot
  reading: StreakSnapshot
}

function fail(message: string, error?: { code?: string; status?: number }): StreakFailure {
  return { ok: false, error: { code: 'unavailable', message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function parseSnapshot(row: Record<string, unknown>, prefix: 'writing' | 'reading'): StreakSnapshot {
  return {
    current: count(row[`${prefix}_current`]),
    longest: count(row[`${prefix}_longest`]),
    lastActiveDay: text(row[`${prefix}_last_active_day`]),
  }
}

export async function getUserStreaks(userId: string): Promise<StreakResult<UserStreaks>> {
  const { data, error } = await supabase.from('user_streaks').select('*').eq('user_id', userId).maybeSingle()
  if (error) return fail('We could not load streaks. Try again.', error)
  if (!data) {
    return {
      ok: true,
      data: {
        writing: { current: 0, longest: 0, lastActiveDay: null },
        reading: { current: 0, longest: 0, lastActiveDay: null },
      },
    }
  }
  const row = data as Record<string, unknown>
  return {
    ok: true,
    data: {
      writing: parseSnapshot(row, 'writing'),
      reading: parseSnapshot(row, 'reading'),
    },
  }
}
