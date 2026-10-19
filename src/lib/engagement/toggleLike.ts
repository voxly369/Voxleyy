import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { engagementErrorMessage } from './errors.ts'

export type ToggleEngagementFailure = {
  ok: false
  error: {
    code: 'forbidden' | 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type ToggleLikeResult =
  | { ok: true; liked: boolean; likeCountDelta: -1 | 0 | 1 }
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

export async function toggleLike(creationId: string, currentlyLiked: boolean): Promise<ToggleLikeResult> {
  const userId = await currentUserId()
  if (!userId) {
    return {
      ok: false,
      error: { code: 'forbidden', message: 'Sign in to like this work.' },
    }
  }

  if (currentlyLiked) {
    const { error } = await supabase.from('likes').delete().eq('user_id', userId).eq('creation_id', creationId)
    if (error) {
      return fail(error, engagementErrorMessage(error, 'We could not update your like. Try again.'))
    }
    return { ok: true, liked: false, likeCountDelta: -1 }
  }

  const { error } = await supabase.from('likes').insert({ user_id: userId, creation_id: creationId })
  if (!error) return { ok: true, liked: true, likeCountDelta: 1 }
  if (error.code === '23505') return { ok: true, liked: true, likeCountDelta: 0 }
  return fail(error, engagementErrorMessage(error, 'We could not update your like. Try again.'))
}
