import { supabase } from '../supabaseClient.ts'
import { safetyFail } from './safetyFailure.ts'
import type { HiddenWordRow, SafetyResult } from './types.ts'

const WORD_MAX = 40

export function normalizeHiddenWord(raw: string): { ok: true; word: string } | { ok: false; message: string } {
  const word = raw.trim()
  if (!word) return { ok: false, message: 'Enter a word to hide.' }
  if (word.length > WORD_MAX) return { ok: false, message: `Words must be at most ${WORD_MAX} characters.` }
  return { ok: true, word }
}

export async function addHiddenWord(raw: string): Promise<SafetyResult<null>> {
  const normalized = normalizeHiddenWord(raw)
  if (!normalized.ok) return safetyFail('invalid', normalized.message)

  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to manage hidden words.')

  const { error } = await supabase.from('hidden_words').insert({ user_id: userId, word: normalized.word })
  if (error?.code === '23505') return { ok: true, data: null }
  if (error?.message?.includes('100 words')) return safetyFail('invalid', error.message, error)
  if (error) return safetyFail('unavailable', 'We could not save that word. Try again.', error)
  return { ok: true, data: null }
}

export async function removeHiddenWord(word: string): Promise<SafetyResult<null>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return safetyFail('forbidden', 'Sign in to manage hidden words.')

  const { error } = await supabase.from('hidden_words').delete().eq('user_id', userId).eq('word', word)
  if (error) return safetyFail('unavailable', 'We could not remove that word. Try again.', error)
  return { ok: true, data: null }
}

export async function listHiddenWords(): Promise<SafetyResult<HiddenWordRow[]>> {
  const { data, error } = await supabase
    .from('hidden_words')
    .select('word, created_at')
    .order('word', { ascending: true })

  if (error) return safetyFail('unavailable', 'We could not load hidden words. Try again.', error)

  const rows: HiddenWordRow[] = (data ?? []).flatMap((row) => {
    if (!row.word || !row.created_at) return []
    return [{ word: String(row.word), createdAt: row.created_at }]
  })
  return { ok: true, data: rows }
}
