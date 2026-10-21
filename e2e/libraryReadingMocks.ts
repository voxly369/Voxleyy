const READER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_ID = '22222222-2222-2222-2222-222222222222'
const OTHER_USERNAME = 'writertwo'
const OTHER_DISPLAY = 'Writer Two'
const DEFAULT_CREATION_ID = '00000000-0000-0000-0000-000000000001'

export type E2eProgressRow = {
  user_id: string
  creation_id: string
  percent: number
  position: number
  position_offset: number
  completed: boolean
  first_read_at: string
  updated_at: string
}

export type E2eSaveRow = { user_id: string; creation_id: string; saved_at: string }
export type E2eCollectionRow = { id: string; user_id: string; name: string; created_at: string; updated_at: string }
export type E2eCollectionItemRow = { collection_id: string; creation_id: string; added_at: string }

const progressRows: E2eProgressRow[] = []
const saveRows: E2eSaveRow[] = []
const collectionRows: E2eCollectionRow[] = []
const collectionItemRows: E2eCollectionItemRow[] = []

let nextCollectionId = 1

export function resetLibraryReadingMocks() {
  progressRows.length = 0
  saveRows.length = 0
  collectionRows.length = 0
  collectionItemRows.length = 0
  nextCollectionId = 1
}

function libraryItemFields(creationId: string) {
  return {
    creation_id: creationId,
    is_available: true,
    type: 'story',
    title: 'Long story',
    caption: null,
    body_excerpt: 'Body excerpt',
    body_truncated: false,
    cover_url: null,
    published_at: '2026-01-01T00:00:00Z',
    author_id: OTHER_ID,
    author_username: OTHER_USERNAME,
    author_display_name: OTHER_DISPLAY,
    author_avatar_url: null,
    author_verified: false,
  }
}

function progressForUser(userId: string) {
  return progressRows.filter((row) => row.user_id === userId)
}

function continueRows(userId: string) {
  return progressForUser(userId).filter((row) => !row.completed && row.percent > 0)
}

function historyRows(userId: string) {
  return progressForUser(userId)
}

function savedLibraryRows(userId: string) {
  return saveRows
    .filter((row) => row.user_id === userId)
    .map((row) => ({
      ...libraryItemFields(row.creation_id),
      saved_at: row.saved_at,
    }))
}

export function libraryReadingMockHandleRest(url: string, method: string, postData: unknown): unknown[] | undefined {
  if (url.includes('/rest/v1/post_reading_progress')) {
    if (method === 'GET') {
      const creationMatch = url.match(/creation_id=eq\.([^&]+)/)
      const userMatch = url.match(/user_id=eq\.([^&]+)/)
      const creationId = creationMatch?.[1]
      const userId = userMatch?.[1] ?? READER_ID
      const rows = progressForUser(userId).filter((row) => !creationId || row.creation_id === creationId)
      return rows
    }
    if (method === 'POST') {
      const rows = Array.isArray(postData) ? postData : [postData]
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue
        const record = row as Record<string, unknown>
        const userId = String(record.user_id ?? READER_ID)
        const creationId = String(record.creation_id ?? DEFAULT_CREATION_ID)
        const now = new Date().toISOString()
        const existing = progressRows.find((p) => p.user_id === userId && p.creation_id === creationId)
        const next: E2eProgressRow = {
          user_id: userId,
          creation_id: creationId,
          percent: Number(record.percent ?? 0),
          position: Number(record.position ?? 0),
          position_offset: Number(record.position_offset ?? 0),
          completed: Boolean(record.completed),
          first_read_at: existing?.first_read_at ?? now,
          updated_at: now,
        }
        if (existing) Object.assign(existing, next)
        else progressRows.push(next)
      }
      return []
    }
    if (method === 'DELETE') {
      for (let i = progressRows.length - 1; i >= 0; i -= 1) {
        if (progressRows[i]?.user_id === READER_ID) progressRows.splice(i, 1)
      }
      return []
    }
    return []
  }

  if (url.includes('/rest/v1/library_continue_reading')) {
    return continueRows(READER_ID).map((row) => ({
      ...libraryItemFields(row.creation_id),
      user_id: row.user_id,
      percent: row.percent,
      position: row.position,
      completed: row.completed,
      first_read_at: row.first_read_at,
      updated_at: row.updated_at,
    }))
  }

  if (url.includes('/rest/v1/library_reading_history')) {
    return historyRows(READER_ID).map((row) => ({
      ...libraryItemFields(row.creation_id),
      user_id: row.user_id,
      percent: row.percent,
      position: row.position,
      completed: row.completed,
      first_read_at: row.first_read_at,
      updated_at: row.updated_at,
    }))
  }

  if (url.includes('/rest/v1/library_saved_items')) {
    return savedLibraryRows(READER_ID)
  }

  if (url.includes('/rest/v1/saves')) {
    if (method === 'DELETE') {
      const creationMatch = url.match(/creation_id=eq\.([^&]+)/)
      const creationId = creationMatch?.[1]
      if (creationId) {
        const idx = saveRows.findIndex((row) => row.user_id === READER_ID && row.creation_id === creationId)
        if (idx >= 0) saveRows.splice(idx, 1)
      }
      return []
    }
    if (method === 'GET') return saveRows.filter((row) => row.user_id === READER_ID)
    return []
  }

  if (url.includes('/rest/v1/reader_collections') && !url.includes('reader_collection_items')) {
    if (method === 'GET') {
      return collectionRows.filter((row) => row.user_id === READER_ID)
    }
    if (method === 'POST') {
      const record = (postData ?? {}) as Record<string, unknown>
      const name = String(record.name ?? '').trim()
      if (collectionRows.filter((row) => row.user_id === READER_ID).length >= 50) {
        return []
      }
      const now = new Date().toISOString()
      const id = `c0000000-0000-0000-0000-${String(nextCollectionId++).padStart(12, '0')}`
      collectionRows.push({ id, user_id: READER_ID, name, created_at: now, updated_at: now })
      return [{ id }]
    }
    return []
  }

  if (url.includes('/rest/v1/reader_collection_items')) {
    if (method === 'POST') {
      const record = (postData ?? {}) as Record<string, unknown>
      const collectionId = String(record.collection_id ?? '')
      const creationId = String(record.creation_id ?? DEFAULT_CREATION_ID)
      const saved = saveRows.some((row) => row.user_id === READER_ID && row.creation_id === creationId)
      if (!saved) return []
      collectionItemRows.push({ collection_id: collectionId, creation_id: creationId, added_at: new Date().toISOString() })
      return []
    }
    if (method === 'GET') {
      const collectionMatch = url.match(/collection_id=eq\.([^&]+)/)
      const collectionId = collectionMatch?.[1]
      return collectionItemRows
        .filter((row) => row.collection_id === collectionId)
        .map((row) => ({
          ...libraryItemFields(row.creation_id),
          collection_id: row.collection_id,
          added_at: row.added_at,
        }))
    }
    return []
  }

  if (url.includes('/rest/v1/reader_preferences')) {
    return []
  }

  return undefined
}

/** Seed saved post and optional progress for e2e flows. */
export function seedLibrarySave(creationId: string = DEFAULT_CREATION_ID) {
  if (!saveRows.some((row) => row.user_id === READER_ID && row.creation_id === creationId)) {
    saveRows.push({ user_id: READER_ID, creation_id: creationId, saved_at: new Date().toISOString() })
  }
}

export function seedReadingProgress(input: {
  creationId?: string
  percent: number
  position?: number
  positionOffset?: number
}) {
  const now = new Date().toISOString()
  progressRows.push({
    user_id: READER_ID,
    creation_id: input.creationId ?? DEFAULT_CREATION_ID,
    percent: input.percent,
    position: input.position ?? 0,
    position_offset: input.positionOffset ?? 0,
    completed: false,
    first_read_at: now,
    updated_at: now,
  })
}
