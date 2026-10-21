import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { bookmarkLabelSchema, readerBookmarkSchema, type ReaderBookmark } from './highlightSchema.ts'

function rowFromSingle(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) ?? null
  if (data && typeof data === 'object') return data as Record<string, unknown>
  return null
}

function mapRow(row: Record<string, unknown>): ReaderBookmark | null {
  const parsed = readerBookmarkSchema.safeParse({
    id: row.id,
    creationId: row.creation_id,
    paragraph: row.paragraph,
    paragraphOffset: Number(row.paragraph_offset ?? 0),
    label: row.label ?? null,
    createdAt: row.created_at,
  })
  return parsed.success ? parsed.data : null
}

export async function listBookmarksForCreation(creationId: string): Promise<ReaderBookmark[]> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user.id) return []
  const { data, error } = await supabase
    .from('reader_bookmarks')
    .select('*')
    .eq('creation_id', creationId)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('bookmarks load failed', providerFields(error))
    return []
  }
  return (data ?? []).flatMap((row) => {
    const mapped = mapRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
}

export async function createBookmark(input: {
  creationId: string
  paragraph: number
  paragraphOffset: number
  label?: string | null
}): Promise<{ ok: true; bookmark: ReaderBookmark } | { ok: false; message: string }> {
  const labelParsed = bookmarkLabelSchema.safeParse(input.label ?? null)
  if (!labelParsed.success) return { ok: false, message: 'Bookmark label is too long.' }
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return { ok: false, message: 'Sign in to bookmark.' }

  const { data, error } = await supabase
    .from('reader_bookmarks')
    .insert({
      user_id: userId,
      creation_id: input.creationId,
      paragraph: input.paragraph,
      paragraph_offset: Math.min(1, Math.max(0, input.paragraphOffset)),
      label: labelParsed.data,
    })
    .select('*')
    .single()
  if (error) return { ok: false, message: error.message || 'Could not save bookmark.' }
  const row = rowFromSingle(data)
  const mapped = row ? mapRow(row) : null
  if (!mapped) return { ok: false, message: 'Could not save bookmark.' }
  return { ok: true, bookmark: mapped }
}

export async function deleteBookmark(id: string): Promise<boolean> {
  const { error } = await supabase.from('reader_bookmarks').delete().eq('id', id)
  return !error
}

export async function deleteBookmarkAtPosition(
  creationId: string,
  paragraph: number,
): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return false
  const { error } = await supabase
    .from('reader_bookmarks')
    .delete()
    .eq('creation_id', creationId)
    .eq('paragraph', paragraph)
    .eq('user_id', userId)
  return !error
}
