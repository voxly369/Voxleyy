import type { CreationDetail } from '../creations/types.ts'
import { listBookmarksForCreation } from './bookmarksApi.ts'
import { listHighlightsForCreation } from './highlightsApi.ts'
import {
  getOfflinePackage,
  removeOfflinePackage,
  saveOfflinePackage,
  type OfflineReadingPackage,
} from './offlineReadingStore.ts'
import { fetchPostProgress } from './progressApi.ts'
import type { StoredReadingPosition } from './readingPosition.ts'

/** IndexedDB only — no service worker; offline copies exist only in this browser profile. */

export function creationDetailFromOfflinePackage(pkg: OfflineReadingPackage): CreationDetail {
  const w = pkg.work
  const now = pkg.savedAt
  return {
    id: w.id,
    type: w.type,
    title: w.title,
    caption: null,
    status: 'published',
    audience: w.audience,
    coverUrl: w.coverUrl,
    createdAt: now,
    updatedAt: now,
    bodyText: w.bodyText,
    bodyJson: w.bodyJson,
    genre: null,
    mood: null,
    language: 'en',
    isOwn: false,
    author: {
      id: '00000000-0000-0000-0000-000000000099',
      username: w.authorUsername,
      displayName: w.authorDisplayName,
      avatarUrl: null,
      verified: false,
    },
  }
}

export async function isCreationOfflineSaved(creationId: string): Promise<boolean> {
  const pkg = await getOfflinePackage(creationId)
  return pkg != null
}

export async function enableOfflineReadingForWork(
  work: CreationDetail,
  position: StoredReadingPosition | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [highlights, bookmarks, progressRow] = await Promise.all([
    listHighlightsForCreation(work.id),
    listBookmarksForCreation(work.id),
    fetchPostProgress(work.id),
  ])
  const progress =
    position ??
    (progressRow && !progressRow.completed
      ? {
          paragraphIndex: progressRow.position,
          positionOffset: progressRow.positionOffset,
          percent: progressRow.percent,
        }
      : null)

  const pkg: OfflineReadingPackage = {
    creationId: work.id,
    savedAt: new Date().toISOString(),
    work: {
      id: work.id,
      type: work.type,
      title: work.title,
      bodyJson: work.bodyJson,
      bodyText: work.bodyText,
      coverUrl: work.coverUrl,
      audience: work.audience,
      authorDisplayName: work.author.displayName,
      authorUsername: work.author.username,
    },
    highlights,
    bookmarks,
    progress,
    pendingHighlightOps: [],
    pendingBookmarkOps: [],
  }
  return saveOfflinePackage(pkg)
}

export async function disableOfflineReadingForCreation(creationId: string): Promise<void> {
  await removeOfflinePackage(creationId)
}

export async function updateOfflineReadingProgress(
  creationId: string,
  position: StoredReadingPosition,
): Promise<void> {
  const pkg = await getOfflinePackage(creationId)
  if (!pkg) return
  await saveOfflinePackage({ ...pkg, progress: position })
}
