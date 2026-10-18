// Public bucket URLs render in the app; listing is limited to the signed-in user's folder.
// Covers for private creations will move to a private bucket with signed URLs in a later step.
import { supabase } from '../supabaseClient.ts'
import type { ProfileResult } from './types.ts'
import { updateOwnProfile } from './api.ts'

export type MediaBucket = 'avatars' | 'banners'

const BUCKET_COLUMN = {
  avatars: 'avatar_url',
  banners: 'banner_url',
} as const

function fail(message: string): ProfileResult<never> {
  return { ok: false, error: { code: 'unavailable', message } }
}

export function storageObjectPath(publicUrl: string, bucket: MediaBucket, userId: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  const path = decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0] ?? '')
  if (!path.startsWith(`${userId}/`) || path.includes('..')) return null
  return path
}

function uploadWithProgress(
  bucket: MediaBucket,
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
    xhr.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', anonKey)
    xhr.setRequestHeader('Content-Type', 'image/webp')
    xhr.setRequestHeader('x-upsert', 'false')
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

function uploadErrorMessage(status: string): string {
  if (status === '401' || status === '403') return 'You do not have permission to upload that image.'
  if (status === '413') return 'That image is larger than 5 MB.'
  if (status === 'network') return 'We could not upload that image. Check your connection and try again.'
  return 'We could not upload that image. Try again.'
}

async function removeObject(bucket: MediaBucket, path: string) {
  await supabase.storage.from(bucket).remove([path])
}

export async function saveProfileImage(input: {
  bucket: MediaBucket
  userId: string
  blob: Blob
  previousUrl: string | null
  onProgress: (ratio: number) => void
}): Promise<ProfileResult<string>> {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (!accessToken || data.session?.user.id !== input.userId) {
    return fail('Sign in again to upload an image.')
  }

  // Storage policy requires the first folder to be the signed-in user id.
  const path = `${input.userId}/${crypto.randomUUID()}.webp`
  try {
    await uploadWithProgress(input.bucket, path, input.blob, accessToken, input.onProgress)
  } catch (error) {
    const status = error instanceof Error ? error.message : ''
    return fail(uploadErrorMessage(status))
  }

  const { data: published } = supabase.storage.from(input.bucket).getPublicUrl(path)
  const publicUrl = published.publicUrl
  const column = BUCKET_COLUMN[input.bucket]
  const saved = await updateOwnProfile({ [column]: publicUrl })
  if (!saved.ok) {
    await removeObject(input.bucket, path)
    return saved
  }

  const previousPath = input.previousUrl ? storageObjectPath(input.previousUrl, input.bucket, input.userId) : null
  if (previousPath && previousPath !== path) await removeObject(input.bucket, previousPath)
  return { ok: true, data: publicUrl }
}

export async function clearProfileImage(input: {
  bucket: MediaBucket
  userId: string
  previousUrl: string | null
}): Promise<ProfileResult<true>> {
  const column = BUCKET_COLUMN[input.bucket]
  const saved = await updateOwnProfile({ [column]: null })
  if (!saved.ok) return saved
  const previousPath = input.previousUrl ? storageObjectPath(input.previousUrl, input.bucket, input.userId) : null
  if (previousPath) await removeObject(input.bucket, previousPath)
  return { ok: true, data: true }
}
