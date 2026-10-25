import { supabase } from '../supabaseClient.ts'
import { listContinueReading } from '../library/listLibrary.ts'
import type { ChecklistSignals } from './checklist.ts'

export async function fetchChecklistSignals(
  userId: string,
  profileBio: string | null,
  avatarUrl: string | null,
): Promise<ChecklistSignals> {
  const hasAvatar = Boolean(avatarUrl?.trim())
  const hasBio = Boolean(profileBio?.trim() && profileBio.trim().length >= 8)

  const [posts, follows, saves, progress, feedback] = await Promise.all([
    supabase.from('creations').select('id').eq('author_id', userId).eq('status', 'published').limit(5),
    supabase.from('follows').select('followee_id').eq('follower_id', userId).limit(5),
    supabase.from('library_saved_items').select('creation_id').eq('user_id', userId).limit(1),
    listContinueReading(),
    supabase.from('app_feedback').select('id').eq('user_id', userId).limit(1),
  ])

  const readingProgressCount =
    progress.ok && progress.items.length > 0 ? progress.items.length : 0

  return {
    hasAvatar,
    hasBio,
    postCount: posts.data?.length ?? 0,
    followCount: follows.data?.length ?? 0,
    librarySaveCount: saves.data?.length ?? 0,
    readingProgressCount,
    feedbackSent: (feedback.data?.length ?? 0) > 0,
  }
}
