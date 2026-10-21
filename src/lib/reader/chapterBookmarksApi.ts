import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { readerBookmarkSchema, type ReaderBookmark } from './highlightSchema.ts'

function mapRow(row: Record<string, unknown>): ReaderBookmark | null {
  const parsed = readerBookmarkSchema.safeParse({
    id: row.id,
    creationId: row.chapter_id ?? row.creation_id,
    paragraph: row.paragraph,
    paragraphOffset: Number(row.paragraph_offset ?? 0),
    label: row.label ?? null,
    createdAt: row.created_at,
  })
  return parsed.success ? parsed.data : null
}

export async function listBookmarksForChapter(chapterId: string): Promise<ReaderBookmark[]> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user.id) return []
  const { data, error } = await supabase
    .from('reader_bookmarks')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('chapter bookmarks load failed', providerFields(error))
    return []
  }
  return (data ?? []).flatMap((row) => {
    const mapped = mapRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
}

export async function createChapterBookmark(input: {
  chapterId: string
  paragraph: number
  paragraphOffset: number
}): Promise<{ ok: true; bookmark: ReaderBookmark } | { ok: false; message: string }> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return { ok: false, message: 'Sign in to bookmark.' }
  const { data, error } = await supabase
    .from('reader_bookmarks')
    .insert({
      user_id: userId,
      chapter_id: input.chapterId,
      paragraph: input.paragraph,
      paragraph_offset: Math.min(1, Math.max(0, input.paragraphOffset)),
      label: null,
    })
    .select('*')
    .single()
  if (error) return { ok: false, message: error.message || 'Could not save bookmark.' }
  const mapped = data ? mapRow(data as Record<string, unknown>) : null
  if (!mapped) return { ok: false, message: 'Could not save bookmark.' }
  return { ok: true, bookmark: mapped }
}

export async function deleteChapterBookmark(id: string): Promise<boolean> {
  const { error } = await supabase.from('reader_bookmarks').delete().eq('id', id)
  return !error
}
