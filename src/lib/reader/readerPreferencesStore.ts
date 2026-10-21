import { supabase } from '../supabaseClient.ts'
import {
  assertReaderPreferencesSize,
  defaultReaderPreferences,
  parseReaderPreferences,
  type ReaderPreferences,
} from './readerPreferencesSchema.ts'

const STORAGE_KEY = 'voxly:reader-preferences'

function readLocal(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultReaderPreferences
    return parseReaderPreferences(JSON.parse(raw))
  } catch {
    return defaultReaderPreferences
  }
}

function writeLocal(prefs: ReaderPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadReaderPreferences(): ReaderPreferences {
  return readLocal()
}

export function saveReaderPreferencesLocal(prefs: ReaderPreferences): ReaderPreferences {
  const parsed = parseReaderPreferences(prefs)
  assertReaderPreferencesSize(parsed)
  writeLocal(parsed)
  return parsed
}

export async function syncReaderPreferencesToAccount(prefs: ReaderPreferences): Promise<void> {
  const parsed = saveReaderPreferencesLocal(prefs)
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return
  const { error } = await supabase.from('reader_preferences').upsert(
    { user_id: userId, preferences: parsed },
    { onConflict: 'user_id' },
  )
  if (error) console.warn('reader preferences sync failed')
}

export async function hydrateReaderPreferencesFromAccount(): Promise<ReaderPreferences> {
  const local = readLocal()
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return local
  const { data } = await supabase.from('reader_preferences').select('preferences').eq('user_id', userId).maybeSingle()
  if (!data?.preferences) return local
  const merged = parseReaderPreferences({ ...local, ...(data.preferences as object) })
  writeLocal(merged)
  return merged
}
