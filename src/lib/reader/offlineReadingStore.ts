import type { ReaderBookmark, ReaderHighlight } from './highlightSchema.ts'
import type { CreationDetail } from '../creations/types.ts'
import type { StoredReadingPosition } from './readingPosition.ts'

const DB_NAME = 'voxly-offline-reading'
const DB_VERSION = 1
const STORE = 'packages'
export const OFFLINE_ITEM_CAP = 50

export type OfflineReadingPackage = {
  creationId: string
  savedAt: string
  work: Pick<
    CreationDetail,
    'id' | 'type' | 'title' | 'bodyJson' | 'bodyText' | 'coverUrl' | 'audience'
  > & {
    authorDisplayName: string
    authorUsername: string
  }
  highlights: ReaderHighlight[]
  bookmarks: ReaderBookmark[]
  progress: StoredReadingPosition | null
  pendingHighlightOps: OfflineHighlightOp[]
  pendingBookmarkOps: OfflineBookmarkOp[]
}

export type OfflineHighlightOp =
  | { kind: 'create'; tempId: string; payload: Omit<ReaderHighlight, 'id' | 'createdAt' | 'updatedAt'> }
  | { kind: 'update'; id: string; colour?: ReaderHighlight['colour']; note?: string | null }
  | { kind: 'delete'; id: string }

export type OfflineBookmarkOp =
  | { kind: 'create'; tempId: string; payload: Omit<ReaderBookmark, 'id' | 'createdAt'> }
  | { kind: 'delete'; id: string }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'creationId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed'))
  })
}

export async function listOfflinePackages(): Promise<OfflineReadingPackage[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result as OfflineReadingPackage[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function getOfflinePackage(creationId: string): Promise<OfflineReadingPackage | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(creationId)
    req.onsuccess = () => resolve((req.result as OfflineReadingPackage | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveOfflinePackage(pkg: OfflineReadingPackage): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await listOfflinePackages()
  const already = existing.some((p) => p.creationId === pkg.creationId)
  if (!already && existing.length >= OFFLINE_ITEM_CAP) {
    return { ok: false, message: 'Offline storage is full (50 saved posts). Remove one to add another.' }
  }
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(pkg)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not save offline copy. Your browser storage may be full.' }
  }
}

export async function removeOfflinePackage(creationId: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(creationId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllOfflinePackages(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function isOfflineSaved(packages: readonly OfflineReadingPackage[], creationId: string): boolean {
  return packages.some((p) => p.creationId === creationId)
}
