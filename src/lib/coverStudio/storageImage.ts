import { coverPublicUrl } from '../creations/coverUpload.ts'

const imageCache = new Map<string, Promise<HTMLImageElement>>()

function loadUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load'))
    img.src = url
  })
}

/** Resolve a covers-bucket storage key (path under user id) to a drawable image. */
export function resolveCoverStorageImage(userId: string, storageKey: string): Promise<HTMLImageElement | null> {
  if (!storageKey || storageKey.includes('..')) return Promise.resolve(null)
  const fileName = storageKey.startsWith(`${userId}/`) ? storageKey.slice(userId.length + 1) : storageKey
  const url = coverPublicUrl(userId, fileName)
  const cacheKey = url
  let promise = imageCache.get(cacheKey)
  if (!promise) {
    promise = loadUrl(url).catch(() => {
      imageCache.delete(cacheKey)
      throw new Error('load')
    })
    imageCache.set(cacheKey, promise)
  }
  return promise.catch(() => null)
}
