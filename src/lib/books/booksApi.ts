import type { Json } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { createDraft } from '../creations/api.ts'
import type { BookMetadataInput, BookRecord, BookTocChapter, LibraryBookRow } from './bookSchema.ts'
import { validateBookMetadata } from './bookValidation.ts'

export type BookApiFailure = {
  ok: false
  error: { code: 'forbidden' | 'not_found' | 'invalid' | 'unavailable'; message: string; providerCode?: string }
}

export type BookApiResult<T> = { ok: true; data: T } | BookApiFailure

function fail(code: BookApiFailure['error']['code'], message: string, error?: { code?: string }): BookApiFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseAuthor(row: Record<string, unknown>) {
  const author = row.author
  if (!author || typeof author !== 'object') return undefined
  const a = author as Record<string, unknown>
  const id = text(a.id)
  const username = text(a.username)
  if (!id || !username) return undefined
  return {
    id,
    username,
    displayName: text(a.display_name),
    avatarUrl: text(a.avatar_url),
    verified: Boolean(a.verified),
  }
}

function parseBookRow(row: Record<string, unknown>, creation?: Record<string, unknown>): BookRecord {
  return {
    id: String(row.id),
    authorId: String(row.author_id),
    title: text(creation?.title) ?? text(row.title) ?? 'Untitled',
    subtitle: text(row.subtitle),
    description: text(row.description) ?? '',
    coverUrl: text(creation?.cover_url),
    status: (text(creation?.status) ?? 'draft') as BookRecord['status'],
    audience: (text(creation?.audience) ?? 'private') as BookRecord['audience'],
    saleModel: (text(row.sale_model) ?? 'free') as BookRecord['saleModel'],
    priceCents: Number(row.price_cents ?? 0),
    currency: text(row.currency) ?? 'GBP',
    rentalDays: row.rental_days == null ? null : Number(row.rental_days),
    isbnInternal: text(row.isbn_internal),
    updatedAt: text(row.updated_at) ?? new Date().toISOString(),
    author: parseAuthor(creation ?? row),
  }
}

const BOOK_COLUMNS =
  'id, author_id, subtitle, description, sale_model, price_cents, currency, rental_days, isbn_internal, updated_at' as const

const CREATION_EMBED =
  'creation:creations!books_id_fkey(id, title, cover_url, status, audience, author_id, author:profiles_public!creations_author_id_fkey(id, username, display_name, avatar_url, verified))' as const

export async function createBookDraft(input: {
  title?: string
  description?: string
}): Promise<BookApiResult<BookRecord>> {
  const title = input.title?.trim() || 'Untitled book'
  const created = await createDraft({
    type: 'book',
    title,
    body_text: '',
    audience: 'private',
  })
  if (!created.ok) return fail(created.error.code === 'forbidden' ? 'forbidden' : 'unavailable', created.error.message)

  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return fail('forbidden', 'Sign in again to save a draft.')
  const { data, error } = await supabase
    .from('books')
    .insert({
      id: created.data.id,
      author_id: userId,
      description: input.description?.trim() ?? '',
      sale_model: 'free',
      price_cents: 0,
      currency: 'GBP',
    })
    .select(`${BOOK_COLUMNS}, ${CREATION_EMBED}`)
    .single()

  if (error || !data) return fail('unavailable', 'We could not start this book. Try again.', error ?? undefined)
  const creation = (data as Record<string, unknown>).creation as Record<string, unknown> | undefined
  return { ok: true, data: parseBookRow(data as Record<string, unknown>, creation) }
}

export async function fetchBookById(bookId: string): Promise<BookApiResult<BookRecord>> {
  const { data, error } = await supabase
    .from('books')
    .select(`${BOOK_COLUMNS}, ${CREATION_EMBED}`)
    .eq('id', bookId)
    .maybeSingle()
  if (error) return fail('unavailable', 'We could not load this book. Try again.', error)
  if (!data) return fail('not_found', 'This book was not found.')
  const creation = (data as Record<string, unknown>).creation as Record<string, unknown> | undefined
  return { ok: true, data: parseBookRow(data as Record<string, unknown>, creation) }
}

export async function saveBookMetadata(bookId: string, raw: BookMetadataInput): Promise<BookApiResult<BookRecord>> {
  const validated = validateBookMetadata(raw)
  if (!validated.ok) return fail('invalid', validated.issues[0]?.message ?? 'Check the form.')

  const meta = validated.data
  const { error: creationError } = await supabase
    .from('creations')
    .update({ title: meta.title })
    .eq('id', bookId)

  if (creationError) return fail('unavailable', 'We could not save the title. Try again.', creationError)

  const { data, error } = await supabase
    .from('books')
    .update({
      subtitle: meta.subtitle?.trim() || null,
      description: meta.description,
      sale_model: meta.saleModel,
      price_cents: meta.priceCents,
      currency: meta.currency,
      rental_days: meta.rentalDays,
      isbn_internal: meta.isbnInternal?.trim() || null,
    })
    .eq('id', bookId)
    .select(`${BOOK_COLUMNS}, ${CREATION_EMBED}`)
    .single()

  if (error || !data) return fail('unavailable', 'We could not save this book. Try again.', error ?? undefined)
  const creation = (data as Record<string, unknown>).creation as Record<string, unknown> | undefined
  return { ok: true, data: parseBookRow(data as Record<string, unknown>, creation) }
}

export async function listAuthorBooks(authorId: string): Promise<BookApiResult<BookRecord[]>> {
  const { data, error } = await supabase
    .from('books')
    .select(`${BOOK_COLUMNS}, ${CREATION_EMBED}`)
    .eq('author_id', authorId)
    .order('updated_at', { ascending: false })
  if (error) return fail('unavailable', 'We could not load books. Try again.', error)
  const rows = (data ?? []).map((row) => {
    const creation = (row as Record<string, unknown>).creation as Record<string, unknown> | undefined
    return parseBookRow(row as Record<string, unknown>, creation)
  })
  return { ok: true, data: rows }
}

export async function fetchBookToc(bookId: string): Promise<BookApiResult<BookTocChapter[]>> {
  const { data, error } = await supabase
    .from('book_chapters_toc')
    .select('id, book_id, position, title, status, is_sample, published_at, coming_soon')
    .eq('book_id', bookId)
    .order('position', { ascending: true })
  if (error) return fail('unavailable', 'We could not load chapters. Try again.', error)
  const chapters: BookTocChapter[] = (data ?? []).map((row) => ({
    id: String(row.id),
    bookId: String(row.book_id),
    position: Number(row.position),
    title: String(row.title),
    status: row.status as BookTocChapter['status'],
    isSample: Boolean(row.is_sample),
    publishedAt: text(row.published_at),
    comingSoon: Boolean(row.coming_soon),
  }))
  return { ok: true, data: chapters }
}

export async function listLibraryBooks(): Promise<BookApiResult<LibraryBookRow[]>> {
  const { data, error } = await supabase.from('library_books').select('*').order('last_read_at', { ascending: false, nullsFirst: false })
  if (error) return fail('unavailable', 'We could not load your books. Try again.', error)
  const rows: LibraryBookRow[] = (data ?? []).map((row) => ({
    bookId: String(row.book_id),
    title: String(row.title),
    coverUrl: text(row.cover_url),
    authorId: String(row.author_id),
    authorUsername: String(row.author_username),
    authorDisplayName: text(row.author_display_name),
    saleModel: row.sale_model as LibraryBookRow['saleModel'],
    percent: Number(row.percent ?? 0),
    lastChapterId: text(row.last_chapter_id),
    lastReadAt: text(row.last_read_at),
    readingStatus: row.reading_status as LibraryBookRow['readingStatus'],
    rentalExpiresAt: text(row.rental_expires_at),
    rentalDaysLeft: row.rental_days_left == null ? null : Number(row.rental_days_left),
  }))
  return { ok: true, data: rows }
}

export async function fetchPaymentsEnabled(): Promise<boolean> {
  const { data, error } = await supabase.rpc('payments_enabled')
  if (error) return false
  return Boolean(data)
}

export async function upsertBookReadingProgress(input: {
  bookId: string
  chapterId: string
  percent: number
  position: number
  positionOffset?: number
  completed?: boolean
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return
  const percent = Math.min(100, Math.max(0, input.percent))
  const completed = input.completed ?? percent >= 99.5
  await supabase.from('reading_progress').upsert(
    {
      user_id: userId,
      book_id: input.bookId,
      chapter_id: input.chapterId,
      percent,
      position: Math.max(0, input.position),
      position_offset: Math.min(1, Math.max(0, input.positionOffset ?? 0)),
      completed,
    },
    { onConflict: 'user_id,book_id' },
  )
}

export async function fetchBookReadingProgress(bookId: string): Promise<{
  chapterId: string | null
  percent: number
  position: number
  positionOffset: number
  completed: boolean
} | null> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return null
  const { data } = await supabase
    .from('reading_progress')
    .select('chapter_id, percent, position, position_offset, completed')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle()
  if (!data) return null
  return {
    chapterId: text(data.chapter_id),
    percent: Number(data.percent),
    position: Number(data.position ?? 0),
    positionOffset: Number(data.position_offset ?? 0),
    completed: Boolean(data.completed),
  }
}

export async function updateBookCreationStatus(
  bookId: string,
  status: 'draft' | 'published' | 'unlisted',
): Promise<BookApiResult<true>> {
  const { error } = await supabase.from('creations').update({ status }).eq('id', bookId)
  if (error) return fail('unavailable', error.message || 'We could not update status.', error)
  return { ok: true, data: true }
}

export function plainTextToChapterJson(text: string): Json {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  return {
    version: 1,
    format: 'rich',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    })),
  } as Json
}
