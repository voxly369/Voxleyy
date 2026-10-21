const READER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_ID = '22222222-2222-2222-2222-222222222222'
const OTHER_USERNAME = 'writertwo'
const OTHER_DISPLAY = 'Writer Two'
const READER_USERNAME = 'readerone'
const READER_DISPLAY = 'Reader One'

export const E2E_FREE_BOOK_ID = 'bb000000-0000-0000-0000-000000000002'
export const E2E_PAID_BOOK_ID = 'bb000000-0000-0000-0000-000000000001'
export const E2E_FREE_CHAPTER_ID = 'cc000000-0000-0000-0000-000000000010'
export const E2E_SAMPLE_CHAPTER_ID = 'cc000000-0000-0000-0000-000000000002'

type BookRow = Record<string, unknown>
type ChapterRow = Record<string, unknown>
type EntitlementRow = { id: string; user_id: string; book_id: string; kind: string; starts_at: string; expires_at: null }

const books = new Map<string, BookRow>()
const chapters = new Map<string, ChapterRow>()
const entitlements: EntitlementRow[] = []
let paymentsEnabled = false

function seedDefaultBooks() {
  books.clear()
  chapters.clear()
  entitlements.length = 0
  paymentsEnabled = false

  books.set(E2E_PAID_BOOK_ID, {
    id: E2E_PAID_BOOK_ID,
    author_id: OTHER_ID,
    subtitle: null,
    description: 'Paid book description',
    sale_model: 'purchase',
    price_cents: 499,
    currency: 'GBP',
    rental_days: null,
    isbn_internal: null,
    updated_at: '2026-01-01T00:00:00Z',
    creation: {
      id: E2E_PAID_BOOK_ID,
      title: 'Paid smoke book',
      cover_url: 'https://example.com/paid-cover.jpg',
      status: 'unlisted',
      audience: 'public',
      author_id: OTHER_ID,
      author: {
        id: OTHER_ID,
        username: OTHER_USERNAME,
        display_name: OTHER_DISPLAY,
        avatar_url: null,
        verified: false,
      },
    },
  })

  books.set(E2E_FREE_BOOK_ID, {
    id: E2E_FREE_BOOK_ID,
    author_id: OTHER_ID,
    subtitle: 'A subtitle',
    description: 'Free book description',
    sale_model: 'free',
    price_cents: 0,
    currency: 'GBP',
    rental_days: null,
    isbn_internal: null,
    updated_at: '2026-01-02T00:00:00Z',
    creation: {
      id: E2E_FREE_BOOK_ID,
      title: 'Free smoke book',
      cover_url: 'https://example.com/free-cover.jpg',
      status: 'published',
      audience: 'public',
      author_id: OTHER_ID,
      author: {
        id: OTHER_ID,
        username: OTHER_USERNAME,
        display_name: OTHER_DISPLAY,
        avatar_url: null,
        verified: false,
      },
    },
  })

  const authorBookId = 'bb000000-0000-0000-0000-000000000099'
  books.set(authorBookId, {
    id: authorBookId,
    author_id: READER_ID,
    subtitle: null,
    description: 'Draft book',
    sale_model: 'free',
    price_cents: 0,
    currency: 'GBP',
    rental_days: null,
    isbn_internal: null,
    updated_at: '2026-02-01T00:00:00Z',
    creation: {
      id: authorBookId,
      title: 'Reader draft book',
      cover_url: null,
      status: 'draft',
      audience: 'private',
      author_id: READER_ID,
      author: {
        id: READER_ID,
        username: READER_USERNAME,
        display_name: READER_DISPLAY,
        avatar_url: null,
        verified: false,
      },
    },
  })

  chapters.set(E2E_FREE_CHAPTER_ID, {
    id: E2E_FREE_CHAPTER_ID,
    book_id: E2E_FREE_BOOK_ID,
    position: 1,
    title: 'First chapter',
    body_text: 'Chapter body for reading. '.repeat(30),
    body_json: {
      version: 1,
      format: 'rich',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chapter body for reading. '.repeat(30) }] }],
    },
    status: 'published',
    is_sample: false,
    is_removed: false,
    word_count: 120,
    published_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  })

  chapters.set(E2E_SAMPLE_CHAPTER_ID, {
    id: E2E_SAMPLE_CHAPTER_ID,
    book_id: E2E_PAID_BOOK_ID,
    position: 1,
    title: 'Sample chapter',
    body_text: 'Sample readable body',
    body_json: {
      version: 1,
      format: 'rich',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sample readable body' }] }],
    },
    status: 'published',
    is_sample: true,
    is_removed: false,
    word_count: 3,
    published_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  })
}

seedDefaultBooks()

export function resetBookBuilderMocks() {
  seedDefaultBooks()
}

export function bookBuilderMockHandleRest(url: string, method: string, postData: unknown): unknown[] | undefined {
  if (url.includes('/rest/v1/rpc/payments_enabled')) return paymentsEnabled
  if (url.includes('/rest/v1/rpc/claim_free_book')) {
    const bookId = (postData as { p_book_id?: string })?.p_book_id ?? E2E_FREE_BOOK_ID
    const existing = entitlements.find((e) => e.user_id === READER_ID && e.book_id === bookId)
    if (existing) return existing.id
    const id = 'ent-00000000-0000-0000-0000-000000000001'
    entitlements.push({ id, user_id: READER_ID, book_id: bookId, kind: 'free', starts_at: new Date().toISOString(), expires_at: null })
    return id
  }
  if (url.includes('/rest/v1/rpc/user_has_book_entitlement')) {
    const body = postData as { p_user?: string; p_book?: string } | null
    const bookId = body?.p_book
    const userId = body?.p_user ?? READER_ID
    return entitlements.some((e) => e.user_id === userId && e.book_id === bookId)
  }

  if (url.includes('/rest/v1/books')) {
    if (method === 'GET') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch?.[1]) {
        const row = books.get(idMatch[1])
        return row ? [row] : []
      }
      const authorMatch = url.match(/author_id=eq\.([^&]+)/)
      if (authorMatch?.[1]) {
        return [...books.values()].filter((b) => b.author_id === authorMatch[1])
      }
      return [...books.values()]
    }
    if (method === 'POST') {
      const rows = Array.isArray(postData) ? postData : [postData]
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue
        const id = String((row as BookRow).id ?? crypto.randomUUID())
        const book: BookRow = { ...(row as BookRow), id, updated_at: new Date().toISOString() }
        books.set(id, book)
      }
      return rows
    }
    if (method === 'PATCH' || method === 'PUT') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      const id = idMatch?.[1]
      if (id && books.has(id) && postData && typeof postData === 'object') {
        books.set(id, { ...books.get(id)!, ...(postData as BookRow), updated_at: new Date().toISOString() })
      }
      return []
    }
  }

  if (url.includes('/rest/v1/book_chapters_toc')) {
    const bookMatch = url.match(/book_id=eq\.([^&]+)/)
    const bookId = bookMatch?.[1]
    const rows = [...chapters.values()]
      .filter((ch) => !bookId || ch.book_id === bookId)
      .filter((ch) => !ch.is_removed)
      .map((ch) => ({
        id: ch.id,
        book_id: ch.book_id,
        position: ch.position,
        title: ch.title,
        status: ch.status,
        is_sample: ch.is_sample,
        published_at: ch.published_at,
        coming_soon: ch.status !== 'published',
      }))
    return rows
  }

  if (url.includes('/rest/v1/chapters')) {
    if (method === 'GET') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch?.[1]) {
        const row = chapters.get(idMatch[1])
        return row ? [row] : []
      }
      const bookMatch = url.match(/book_id=eq\.([^&]+)/)
      if (bookMatch?.[1]) {
        return [...chapters.values()].filter((c) => c.book_id === bookMatch[1] && !c.is_removed)
      }
      return [...chapters.values()]
    }
    if (method === 'POST') {
      const rows = Array.isArray(postData) ? postData : [postData]
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue
        const id = String((row as ChapterRow).id ?? `cc000000-0000-0000-0000-${String(chapters.size + 1).padStart(12, '0')}`)
        chapters.set(id, { ...(row as ChapterRow), id, is_removed: false, updated_at: new Date().toISOString() })
      }
      return rows
    }
    if (method === 'PATCH' || method === 'PUT') {
      const idMatch = url.match(/id=eq\.([^&]+)/)
      const id = idMatch?.[1]
      if (id && chapters.has(id) && postData && typeof postData === 'object') {
        chapters.set(id, { ...chapters.get(id)!, ...(postData as ChapterRow), updated_at: new Date().toISOString() })
      }
      return []
    }
  }

  if (url.includes('/rest/v1/library_books')) {
    return entitlements
      .filter((e) => e.user_id === READER_ID)
      .map((e) => {
        const book = books.get(e.book_id)
        const creation = (book?.creation ?? {}) as Record<string, unknown>
        return {
          user_id: e.user_id,
          book_id: e.book_id,
          title: creation.title ?? 'Book',
          cover_url: creation.cover_url ?? null,
          author_id: creation.author_id,
          author_username: OTHER_USERNAME,
          author_display_name: OTHER_DISPLAY,
          sale_model: book?.sale_model ?? 'free',
          percent: 0,
          last_chapter_id: null,
          last_read_at: null,
          reading_status: 'Not started',
          rental_expires_at: null,
          rental_days_left: null,
        }
      })
  }

  if (url.includes('/rest/v1/book_entitlements')) return entitlements.filter((e) => e.user_id === READER_ID)

  if (url.includes('/rest/v1/reading_progress')) {
    if (method === 'GET') return []
    if (method === 'POST') return []
  }

  if (url.includes('/rest/v1/creations') && method === 'POST') {
    const rows = Array.isArray(postData) ? postData : [postData]
    return rows.map((row, index) => ({
      ...(row as object),
      id: `bb000000-0000-0000-0000-${String(200 + index).padStart(12, '0')}`,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  }

  return undefined
}

export { E2E_FREE_BOOK_ID as FREE_BOOK_ID }
