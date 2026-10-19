import { supabase } from '../supabaseClient.ts'
import type { CreationResult } from './types.ts'

function uploadCoverWithProgress(
  path: string,
  body: Blob,
  accessToken: string,
  onProgress: (ratio: number) => void,
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return Promise.reject(new Error('missing-config'))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/covers/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', anonKey)
    xhr.setRequestHeader('Content-Type', body.type || 'image/webp')
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1)
        resolve()
        return
      }
      reject(new Error(String(xhr.status)))
    }
    xhr.onerror = () => reject(new Error('network'))
    xhr.send(body)
  })
}

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
  onProgress?: (ratio: number) => void,
): Promise<CreationResult<string>> {
  const path = `${userId}/${fileName}`
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  try {
    if (token && onProgress) {
      await uploadCoverWithProgress(path, blob, token, onProgress)
    } else {
      const { error: uploadError } = await supabase.storage.from('covers').upload(path, blob, {
        upsert: true,
        contentType: blob.type || 'image/webp',
      })
      if (uploadError) return fail('We could not upload this cover. Try again.')
      onProgress?.(1)
    }
  } catch {
    return fail('We could not upload this cover. Try again.')
  }

  const publicUrl = coverPublicUrl(userId, fileName)
  const { error: updateError } = await supabase
    .from('creations')
    .update({ cover_url: publicUrl, media_url: null })
    .eq('id', creationId)
    .eq('author_id', userId)

  if (updateError) return fail('We could not save this cover. Try again.')
  return { ok: true, data: publicUrl }
}

export function coverStoragePath(publicUrl: string, userId: string): string | null {
  const marker = '/storage/v1/object/public/covers/'
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  const path = decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0] ?? '')
  if (!path.startsWith(`${userId}/`) || path.includes('..')) return null
  return path
}

export async function removeCreationCover(
  userId: string,
  creationId: string,
  publicUrl: string | null,
): Promise<CreationResult<true>> {
  const { error: updateError } = await supabase
    .from('creations')
    .update({ cover_url: null, media_url: null })
    .eq('id', creationId)
    .eq('author_id', userId)
  if (updateError) return fail('We could not remove this cover. Try again.')

  if (publicUrl) {
    const path = coverStoragePath(publicUrl, userId)
    if (path) {
      try {
        await supabase.storage.from('covers').remove([path])
      } catch {
        // Best-effort delete; the URL is already cleared.
      }
    }
  }
  return { ok: true, data: true }
}
