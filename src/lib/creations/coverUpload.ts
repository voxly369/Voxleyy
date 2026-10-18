import { supabase } from '../supabaseClient.ts'
import type { CreationResult } from './types.ts'

function fail(message: string): CreationResult<never> {
  return { ok: false, error: { code: 'unavailable', message } }
}

export function coverPublicUrl(userId: string, fileName: string): string {
  const path = `${userId}/${fileName}`
  const { data } = supabase.storage.from('covers').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadCreationCover(
  userId: string,
  creationId: string,
  blob: Blob,
  fileName: string,
): Promise<CreationResult<string>> {
  const path = `${userId}/${fileName}`
  const { error: uploadError } = await supabase.storage.from('covers').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/webp',
  })
  if (uploadError) return fail('We could not upload this cover. Try again.')

  const publicUrl = coverPublicUrl(userId, fileName)
  const { error: updateError } = await supabase
    .from('creations')
    .update({ cover_url: publicUrl, media_url: null })
    .eq('id', creationId)
    .eq('author_id', userId)

  if (updateError) return fail('We could not save this cover. Try again.')
  return { ok: true, data: publicUrl }
}
