import { notifyLibrarySavesChanged } from '../library/saveEvents.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { engagementErrorMessage } from './errors.ts'
import type { ToggleEngagementFailure } from './toggleLike.ts'

export type ToggleSaveResult =
  | { ok: true; saved: boolean; saveCountDelta: -1 | 0 | 1 }
  | ToggleEngagementFailure

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

function fail(error: { code?: string; message?: string; status?: number }, message: string): ToggleEngagementFailure {
  return {
    ok: false,
    error: {
      code: error.code === '42501' ? 'forbidden' : 'unavailable',
      message,
      ...providerFields(error),
    },
  }
}

export async function toggleSave(creationId: string, currentlySaved: boolean): Promise<ToggleSaveResult> {
  const userId = await currentUserId()
  if (!userId) {
    return {
      ok: false,
      error: { code: 'forbidden', message: 'Sign in to save this work.' },
    }
  }

  if (currentlySaved) {
    const { error } = await supabase.from('saves').delete().eq('user_id', userId).eq('creation_id', creationId)
    if (error) {
      return fail(error, engagementErrorMessage(error, 'We could not update your save. Try again.'))
    }
    notifyLibrarySavesChanged()
    return { ok: true, saved: false, saveCountDelta: -1 }
  }

  const { error } = await supabase.from('saves').insert({ user_id: userId, creation_id: creationId })
  if (!error) {
    notifyLibrarySavesChanged()
    return { ok: true, saved: true, saveCountDelta: 1 }
  }
  if (error.code === '23505') return { ok: true, saved: true, saveCountDelta: 0 }
  return fail(error, engagementErrorMessage(error, 'We could not update your save. Try again.'))
}
