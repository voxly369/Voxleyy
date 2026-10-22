const STORAGE_PREFIX = 'voxly-creation-view:'

export function viewDedupeStorageKey(creationId: string): string {
  return `${STORAGE_PREFIX}${creationId}`
}

/** Returns true when a view should be recorded (not deduped for this browser session). */
export function shouldRecordCreationView(creationId: string, storage: Pick<Storage, 'getItem' | 'setItem'>): boolean {
  const key = viewDedupeStorageKey(creationId)
  if (storage.getItem(key)) return false
  storage.setItem(key, String(Date.now()))
  return true
}
