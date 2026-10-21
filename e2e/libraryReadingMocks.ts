import { e2eBookContinueReadingRows } from './bookBuilderMocks.ts'

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

export type E2eHighlightRow = {
  id: string
  user_id: string
  creation_id: string | null
  chapter_id: string | null
  start_paragraph: number
  start_char: number
  end_paragraph: number
  end_char: number
  quote: string
  colour: string
  note: string | null
  created_at: string
  updated_at: string
}

export type E2eBookmarkRow = {
  id: string
  user_id: string
  creation_id: string | null
  chapter_id: string | null
  paragraph: number
  paragraph_offset: number
  label: string | null
  created_at: string
}

const progressRows: E2eProgressRow[] = []
const saveRows: E2eSaveRow[] = []
const collectionRows: E2eCollectionRow[] = []
const collectionItemRows: E2eCollectionItemRow[] = []
const highlightRows: E2eHighlightRow[] = []
const bookmarkRows: E2eBookmarkRow[] = []

let nextCollectionId = 1
let nextHighlightId = 1
let nextBookmarkId = 1

function mockUuid(prefix: number): string {
  return `550e8400-e29b-41d4-a716-${String(prefix).padStart(12, '0')}`
}

export function resetLibraryReadingMocks() {
  progressRows.length = 0
  saveRows.length = 0
  collectionRows.length = 0
  collectionItemRows.length = 0
  highlightRows.length = 0
  bookmarkRows.length = 0
  nextCollectionId = 1
  nextHighlightId = 1
  nextBookmarkId = 1
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
    const posts = continueRows(READER_ID).map((row) => ({
      ...libraryItemFields(row.creation_id),
      user_id: row.user_id,
      percent: row.percent,
      position: row.position,
      completed: row.completed,
      first_read_at: row.first_read_at,
      updated_at: row.updated_at,
      resume_chapter_id: null,
    }))
    return [...posts, ...e2eBookContinueReadingRows()].sort(
      (a, b) => new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime(),
    )
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

  if (url.includes('/rest/v1/reader_highlights')) {
    if (method === 'GET') {
      const creationMatch = url.match(/creation_id=eq\.([^&]+)/)
      const chapterMatch = url.match(/chapter_id=eq\.([^&]+)/)
      const creationId = creationMatch?.[1]
      const chapterId = chapterMatch?.[1]
      return highlightRows.filter((row) => {
        if (row.user_id !== READER_ID) return false
        if (chapterId) return row.chapter_id === chapterId
        if (creationId) return row.creation_id === creationId
        return true
      })
    }
    if (method === 'POST') {
      const record = (Array.isArray(postData) ? postData[0] : postData) as Record<string, unknown>
      const now = new Date().toISOString()
      const id = mockUuid(1000 + nextHighlightId++)
      highlightRows.push({
        id,
        user_id: String(record.user_id ?? READER_ID),
        creation_id: record.chapter_id ? null : String(record.creation_id ?? DEFAULT_CREATION_ID),
        chapter_id: record.chapter_id ? String(record.chapter_id) : null,
        start_paragraph: Number(record.start_paragraph ?? 0),
        start_char: Number(record.start_char ?? 0),
        end_paragraph: Number(record.end_paragraph ?? 0),
        end_char: Number(record.end_char ?? 0),
        quote: String(record.quote ?? ''),
        colour: String(record.colour ?? 'yellow'),
        note: record.note == null ? null : String(record.note),
        created_at: now,
        updated_at: now,
      })
      return highlightRows.filter((row) => row.id === id)
    }
    if (method === 'PATCH') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      const id = idMatch?.[1]
      const record = (postData ?? {}) as Record<string, unknown>
      const row = highlightRows.find((h) => h.id === id && h.user_id === READER_ID)
      if (row) {
        if (record.colour != null) row.colour = String(record.colour)
        if (record.note !== undefined) row.note = record.note == null ? null : String(record.note)
        row.updated_at = new Date().toISOString()
      }
      return row ? [row] : []
    }
    if (method === 'DELETE') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      const id = idMatch?.[1]
      if (id) {
        const idx = highlightRows.findIndex((h) => h.id === id && h.user_id === READER_ID)
        if (idx >= 0) highlightRows.splice(idx, 1)
      }
      return []
    }
    return []
  }

  if (url.includes('/rest/v1/reader_bookmarks')) {
    if (method === 'GET') {
      const creationMatch = url.match(/creation_id=eq\.([^&]+)/)
      const chapterMatch = url.match(/chapter_id=eq\.([^&]+)/)
      const creationId = creationMatch?.[1]
      const chapterId = chapterMatch?.[1]
      return bookmarkRows.filter((row) => {
        if (row.user_id !== READER_ID) return false
        if (chapterId) return row.chapter_id === chapterId
        if (creationId) return row.creation_id === creationId
        return true
      })
    }
    if (method === 'POST') {
      const record = (Array.isArray(postData) ? postData[0] : postData) as Record<string, unknown>
      const now = new Date().toISOString()
      const id = mockUuid(2000 + nextBookmarkId++)
      bookmarkRows.push({
        id,
        user_id: String(record.user_id ?? READER_ID),
        creation_id: record.chapter_id ? null : String(record.creation_id ?? DEFAULT_CREATION_ID),
        chapter_id: record.chapter_id ? String(record.chapter_id) : null,
        paragraph: Number(record.paragraph ?? 0),
        paragraph_offset: Number(record.paragraph_offset ?? 0),
        label: record.label == null ? null : String(record.label),
        created_at: now,
      })
      return bookmarkRows.filter((row) => row.id === id)
    }
    if (method === 'DELETE') {
      const creationMatch = url.match(/creation_id=eq\.([^&]+)/)
      const paragraphMatch = url.match(/paragraph=eq\.(\d+)/)
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch?.[1]) {
        const idx = bookmarkRows.findIndex((b) => b.id === idMatch[1] && b.user_id === READER_ID)
        if (idx >= 0) bookmarkRows.splice(idx, 1)
      } else if (creationMatch?.[1] && paragraphMatch?.[1]) {
        const idx = bookmarkRows.findIndex(
          (b) =>
            b.user_id === READER_ID &&
            b.creation_id === creationMatch[1] &&
            b.paragraph === Number(paragraphMatch[1]),
        )
        if (idx >= 0) bookmarkRows.splice(idx, 1)
      }
      return []
    }
    return []
  }

  if (url.includes('/rest/v1/library_highlights')) {
    let rows = highlightRows.filter((row) => row.user_id === READER_ID)
    const colourMatch = url.match(/colour=eq\.([^&]+)/)
    if (colourMatch?.[1]) {
      rows = rows.filter((row) => row.colour === colourMatch[1])
    }
    const searchMatch = url.match(/quote\.ilike\.\%22([^%]+)\%22/)
    if (searchMatch?.[1]) {
      const needle = decodeURIComponent(searchMatch[1].replace(/\\"/g, '"')).toLowerCase()
      rows = rows.filter(
        (row) =>
          row.quote.toLowerCase().includes(needle) ||
          (row.note ?? '').toLowerCase().includes(needle),
      )
    }
    return rows.map((row) => {
      if (row.chapter_id) {
        return {
          ...row,
          is_available: true,
          type: 'book',
          title: 'Free smoke book',
          chapter_title: 'First chapter',
          caption: null,
          cover_url: 'https://example.com/free-cover.jpg',
          published_at: '2026-01-02T00:00:00Z',
          author_id: OTHER_ID,
          author_username: OTHER_USERNAME,
          author_display_name: OTHER_DISPLAY,
          author_avatar_url: null,
          author_verified: false,
        }
      }
      return {
        ...row,
        is_available: true,
        type: 'story',
        title: 'Long story',
        caption: null,
        cover_url: null,
        published_at: '2026-01-01T00:00:00Z',
        author_id: OTHER_ID,
        author_username: OTHER_USERNAME,
        author_display_name: OTHER_DISPLAY,
        author_avatar_url: null,
        author_verified: false,
      }
    })
  }

  return undefined
}

/** Seed saved post and optional progress for e2e flows. */
export function seedLibrarySave(creationId: string = DEFAULT_CREATION_ID) {
  if (!saveRows.some((row) => row.user_id === READER_ID && row.creation_id === creationId)) {
    saveRows.push({ user_id: READER_ID, creation_id: creationId, saved_at: new Date().toISOString() })
  }
}

export function seedReaderHighlight(input: {
  creationId?: string
  quote?: string
  colour?: string
  startParagraph?: number
}) {
  const now = new Date().toISOString()
  highlightRows.push({
    id: mockUuid(1000 + nextHighlightId++),
    user_id: READER_ID,
    creation_id: input.creationId ?? DEFAULT_CREATION_ID,
    chapter_id: null,
    start_paragraph: input.startParagraph ?? 0,
    start_char: 0,
    end_paragraph: input.startParagraph ?? 0,
    end_char: Math.min(100, (input.quote ?? 'Highlightable').length),
    quote: input.quote ?? 'Highlightable',
    colour: input.colour ?? 'yellow',
    note: null,
    created_at: now,
    updated_at: now,
  })
}

export function seedChapterHighlight(input: { chapterId: string; quote?: string; bookId?: string }) {
  const now = new Date().toISOString()
  highlightRows.push({
    id: mockUuid(1000 + nextHighlightId++),
    user_id: READER_ID,
    creation_id: input.bookId ?? 'bb000000-0000-0000-0000-000000000002',
    chapter_id: input.chapterId,
    start_paragraph: 0,
    start_char: 0,
    end_paragraph: 0,
    end_char: Math.min(100, (input.quote ?? 'Chapter highlight').length),
    quote: input.quote ?? 'Chapter highlight',
    colour: 'yellow',
    note: null,
    created_at: now,
    updated_at: now,
  })
}

export function seedReaderBookmark(input: { creationId?: string; paragraph?: number }) {
  const now = new Date().toISOString()
  bookmarkRows.push({
    id: mockUuid(2000 + nextBookmarkId++),
    user_id: READER_ID,
    creation_id: input.creationId ?? DEFAULT_CREATION_ID,
    chapter_id: null,
    paragraph: input.paragraph ?? 0,
    paragraph_offset: 0,
    label: null,
    created_at: now,
  })
}

export function seedReadingProgress(input: {
  creationId?: string
  percent: number
  position?: number
  positionOffset?: number
  updatedAt?: string
}) {
  const now = input.updatedAt ?? new Date().toISOString()
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
