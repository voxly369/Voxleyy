import { supabase } from '../supabaseClient.ts'
import type { HighlightColour } from '../reader/highlightSchema.ts'

export type LibraryHighlightRow = {
  id: string
  creationId: string
  chapterId: string | null
  chapterTitle: string | null
  quote: string
  colour: HighlightColour
  note: string | null
  createdAt: string
  updatedAt: string
  isAvailable: boolean
  title: string | null
  authorDisplayName: string | null
  authorUsername: string | null
  coverUrl: string | null
  textChanged: boolean
}

export type LibraryHighlightsCursor = { createdAt: string; id: string }

const PAGE = 20

export async function listLibraryHighlights(input: {
  cursor: LibraryHighlightsCursor | null
  colour: HighlightColour | 'all'
  search: string
}): Promise<
  | { ok: true; rows: LibraryHighlightRow[]; nextCursor: LibraryHighlightsCursor | null }
  | { ok: false; message: string }
> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user.id) return { ok: false, message: 'Sign in to view highlights.' }

  let query = supabase
    .from('library_highlights')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE + 1)

  if (input.colour !== 'all') query = query.eq('colour', input.colour)
  const search = input.search.trim()
  if (search) {
    const escaped = search.replace(/"/g, '\\"')
    query = query.or(`quote.ilike."%${escaped}%",note.ilike."%${escaped}%"`)
  }
  if (input.cursor) {
    query = query.or(
      `created_at.lt."${input.cursor.createdAt}",and(created_at.eq."${input.cursor.createdAt}",id.lt."${input.cursor.id}")`,
    )
  }

  const { data, error } = await query
  if (error) {
    return { ok: false, message: 'We could not load highlights.' }
  }

  const rows = (data ?? []).slice(0, PAGE + 1)
  const hasMore = rows.length > PAGE
  const page = hasMore ? rows.slice(0, PAGE) : rows
  const mapped: LibraryHighlightRow[] = page.map((row) => ({
    id: String(row.id),
    creationId: String(row.creation_id),
    chapterId: row.chapter_id ? String(row.chapter_id) : null,
    chapterTitle: row.chapter_title ? String(row.chapter_title) : null,
    quote: String(row.quote),
    colour: row.colour as HighlightColour,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    isAvailable: row.is_available === true,
    title: row.title ? String(row.title) : null,
    authorDisplayName: row.author_display_name ? String(row.author_display_name) : null,
    authorUsername: row.author_username ? String(row.author_username) : null,
    coverUrl: row.cover_url ? String(row.cover_url) : null,
    textChanged: false,
  }))

  const last = page[page.length - 1]
  const nextCursor =
    hasMore && last
      ? { createdAt: String(last.created_at), id: String(last.id) }
      : null

  return { ok: true, rows: mapped, nextCursor }
}
