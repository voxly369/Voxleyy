import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import type { HighlightColour, ReaderHighlight } from './highlightSchema.ts'
import { highlightNoteSchema, highlightQuoteSchema, readerHighlightSchema } from './highlightSchema.ts'

function mapRow(row: Record<string, unknown>): ReaderHighlight | null {
  const parsed = readerHighlightSchema.safeParse({
    id: row.id,
    creationId: row.chapter_id ?? row.creation_id,
    startParagraph: row.start_paragraph,
    startChar: row.start_char,
    endParagraph: row.end_paragraph,
    endChar: row.end_char,
    quote: row.quote,
    colour: row.colour,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
  return parsed.success ? parsed.data : null
}

export async function listHighlightsForChapter(chapterId: string): Promise<ReaderHighlight[]> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session?.user.id) return []
  const { data, error } = await supabase
    .from('reader_highlights')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('chapter highlights load failed', providerFields(error))
    return []
  }
  return (data ?? []).flatMap((row) => {
    const mapped = mapRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
}

export async function createChapterHighlight(input: {
  chapterId: string
  startParagraph: number
  startChar: number
  endParagraph: number
  endChar: number
  quote: string
  colour: HighlightColour
  note?: string | null
}): Promise<{ ok: true; highlight: ReaderHighlight } | { ok: false; message: string }> {
  const quote = highlightQuoteSchema.safeParse(input.quote.trim())
  if (!quote.success) return { ok: false, message: 'Highlight text is too long or empty.' }
  const noteParsed = highlightNoteSchema.safeParse(input.note ?? null)
  if (!noteParsed.success) return { ok: false, message: 'Note is too long.' }
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return { ok: false, message: 'Sign in to save highlights.' }

  const { data, error } = await supabase
    .from('reader_highlights')
    .insert({
      user_id: userId,
      chapter_id: input.chapterId,
      start_paragraph: input.startParagraph,
      start_char: input.startChar,
      end_paragraph: input.endParagraph,
      end_char: input.endChar,
      quote: quote.data,
      colour: input.colour,
      note: noteParsed.data,
    })
    .select('*')
    .single()
  if (error) return { ok: false, message: error.message || 'Could not save highlight.' }
  const mapped = data ? mapRow(data as Record<string, unknown>) : null
  if (!mapped) return { ok: false, message: 'Could not save highlight.' }
  return { ok: true, highlight: mapped }
}

export async function deleteChapterHighlight(id: string): Promise<boolean> {
  const { error } = await supabase.from('reader_highlights').delete().eq('id', id)
  return !error
}
