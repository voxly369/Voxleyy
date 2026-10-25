/** Shared e2e state for profile avatar URL after mock upload/PATCH. */
let readerAvatarUrl: string | null = null

export function getE2eReaderAvatarUrl(): string | null {
  return readerAvatarUrl
}

export function setE2eReaderAvatarUrl(url: string | null) {
  readerAvatarUrl = url
}

export function resetE2eReaderAvatarUrl() {
  readerAvatarUrl = null
}
