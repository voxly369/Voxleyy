import type { Json } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { parseChapterRichBody, type ChapterDetail, type ChapterDraftInput } from './chapterContentSchema.ts'
import { countWordsInChapterBody } from './wordCount.ts'
import type { BookApiFailure, BookApiResult } from './booksApi.ts'

function fail(code: BookApiFailure['error']['code'], message: string, error?: { code?: string }): BookApiFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function parseChapter(row: Record<string, unknown>): ChapterDetail {
  const bodyJson = parseChapterRichBody(row.body_json)
  return {
    id: String(row.id),
    bookId: String(row.book_id),
    position: Number(row.position),
    title: String(row.title ?? 'Chapter'),
    bodyText: text(row.body_text),
    bodyJson,
    status: (text(row.status) ?? 'draft') as ChapterDetail['status'],
    isSample: Boolean(row.is_sample),
    wordCount: Number(row.word_count ?? countWordsInChapterBody(text(row.body_text), row.body_json as Json | null)),
    publishedAt: text(row.published_at),
    updatedAt: text(row.updated_at) ?? new Date().toISOString(),
  }
}

const CHAPTER_COLUMNS =
  'id, book_id, position, title, body_text, body_json, status, is_sample, word_count, published_at, updated_at' as const

export async function listChaptersForAuthor(bookId: string): Promise<BookApiResult<ChapterDetail[]>> {
  const { data, error } = await supabase
    .from('chapters')
    .select(CHAPTER_COLUMNS)
    .eq('book_id', bookId)
    .eq('is_removed', false)
    .order('position', { ascending: true })
  if (error) return fail('unavailable', 'We could not load chapters.', error)
  return { ok: true, data: (data ?? []).map((row) => parseChapter(row as Record<string, unknown>)) }
}

export async function fetchChapterById(chapterId: string): Promise<BookApiResult<ChapterDetail>> {
  const { data, error } = await supabase.from('chapters').select(CHAPTER_COLUMNS).eq('id', chapterId).maybeSingle()
  if (error) return fail('unavailable', 'We could not load this chapter.', error)
  if (!data) return fail('not_found', 'This chapter was not found.')
  return { ok: true, data: parseChapter(data as Record<string, unknown>) }
}

export async function createChapter(
  bookId: string,
  input: ChapterDraftInput & { bodyJson?: Json | null },
): Promise<BookApiResult<ChapterDetail>> {
  const wordCount = countWordsInChapterBody(input.bodyText, input.bodyJson ?? null)
  const { data: maxRow } = await supabase
    .from('chapters')
    .select('position')
    .eq('book_id', bookId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const position = (maxRow?.position ?? 0) + 1
  const { data, error } = await supabase
    .from('chapters')
    .insert({
      book_id: bookId,
      position,
      title: input.title.trim(),
      body_text: input.bodyText,
      body_json: input.bodyJson ?? null,
      status: input.status ?? 'draft',
      is_sample: input.isSample ?? false,
      word_count: wordCount,
    })
    .select(CHAPTER_COLUMNS)
    .single()
  if (error || !data) return fail('unavailable', error?.message ?? 'We could not add this chapter.', error ?? undefined)
  return { ok: true, data: parseChapter(data as Record<string, unknown>) }
}

export async function saveChapter(
  chapterId: string,
  input: ChapterDraftInput & { bodyJson?: Json | null },
): Promise<BookApiResult<ChapterDetail>> {
  const wordCount = countWordsInChapterBody(input.bodyText, input.bodyJson ?? null)
  const { data, error } = await supabase
    .from('chapters')
    .update({
      title: input.title.trim(),
      body_text: input.bodyText,
      body_json: input.bodyJson ?? null,
      is_sample: input.isSample ?? false,
      status: input.status,
      word_count: wordCount,
    })
    .eq('id', chapterId)
    .select(CHAPTER_COLUMNS)
    .single()
  if (error || !data) return fail('unavailable', 'We could not save this chapter.', error ?? undefined)
  return { ok: true, data: parseChapter(data as Record<string, unknown>) }
}

export async function deleteChapter(chapterId: string): Promise<BookApiResult<true>> {
  const { error } = await supabase.from('chapters').update({ is_removed: true }).eq('id', chapterId)
  if (error) return fail('unavailable', 'We could not remove this chapter.', error)
  return { ok: true, data: true }
}

export async function reorderChapters(bookId: string, orderedIds: string[]): Promise<BookApiResult<true>> {
  const { error } = await supabase.rpc('reorder_book_chapters', {
    p_book_id: bookId,
    p_chapter_ids: orderedIds,
  })
  if (error) return fail('unavailable', error.message || 'We could not reorder chapters.', error)
  return { ok: true, data: true }
}

export async function unpublishChapter(chapterId: string): Promise<BookApiResult<ChapterDetail>> {
  const { data, error } = await supabase
    .from('chapters')
    .update({ status: 'draft', published_at: null })
    .eq('id', chapterId)
    .select(CHAPTER_COLUMNS)
    .single()
  if (error || !data) return fail('unavailable', 'We could not update this chapter.', error ?? undefined)
  return { ok: true, data: parseChapter(data as Record<string, unknown>) }
}

export async function publishChapter(chapterId: string): Promise<BookApiResult<ChapterDetail>> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('chapters')
    .update({ status: 'published', published_at: now })
    .eq('id', chapterId)
    .select(CHAPTER_COLUMNS)
    .single()
  if (error || !data) return fail('unavailable', 'We could not publish this chapter.', error ?? undefined)
  return { ok: true, data: parseChapter(data as Record<string, unknown>) }
}
