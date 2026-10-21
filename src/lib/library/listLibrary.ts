import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { mapLibraryItemRow } from './mapLibraryRow.ts'
import type { LibraryItem, LibrarySavedCursor, ReaderCollection } from './types.ts'

const SAVED_PAGE = 12

export type LibraryFailure = {
  ok: false
  error: { code: 'forbidden' | 'unavailable'; message: string; providerCode?: string; providerStatus?: number }
}

function fail(message: string, error?: { code?: string; status?: number }): LibraryFailure {
  return { ok: false, error: { code: 'unavailable', message, ...providerFields(error) } }
}

async function requireUserId(): Promise<string | LibraryFailure> {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) return { ok: false, error: { code: 'forbidden', message: 'Sign in to open your Library.' } }
  return id
}

export async function listContinueReading(): Promise<{ ok: true; items: LibraryItem[] } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user
  const { data, error } = await supabase
    .from('library_continue_reading')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(24)
  if (error) return fail('We could not load Continue reading.', error)
  const items = (data ?? []).flatMap((row) => {
    const mapped = mapLibraryItemRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
  return { ok: true, items }
}

export async function listLibrarySaved(
  cursor: LibrarySavedCursor | null,
): Promise<{ ok: true; items: LibraryItem[]; nextCursor: LibrarySavedCursor | null } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user

  let query = supabase
    .from('library_saved_items')
    .select('*')
    .order('saved_at', { ascending: false })
    .order('creation_id', { ascending: false })
    .limit(SAVED_PAGE + 1)

  if (cursor) {
    query = query.or(
      `saved_at.lt."${cursor.savedAt}",and(saved_at.eq."${cursor.savedAt}",creation_id.lt."${cursor.creationId}")`,
    )
  }

  const { data, error } = await query
  if (error) return fail('We could not load saved works.', error)
  const rows = data ?? []
  const hasMore = rows.length > SAVED_PAGE
  const page = hasMore ? rows.slice(0, SAVED_PAGE) : rows
  const items = page.flatMap((row) => {
    const mapped = mapLibraryItemRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
  const last = page[page.length - 1] as Record<string, unknown> | undefined
  const nextCursor =
    hasMore && last
      ? { savedAt: String(last.saved_at), creationId: String(last.creation_id) }
      : null
  return { ok: true, items, nextCursor }
}

export async function listReadingHistory(): Promise<{ ok: true; items: LibraryItem[] } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user
  const { data, error } = await supabase
    .from('library_reading_history')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) return fail('We could not load reading history.', error)
  const items = (data ?? []).flatMap((row) => {
    const mapped = mapLibraryItemRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
  return { ok: true, items }
}

export async function listCollections(): Promise<{ ok: true; collections: ReaderCollection[] } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user
  const { data, error } = await supabase
    .from('reader_collections')
    .select('id, name, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) return fail('We could not load collections.', error)
  const collections: ReaderCollection[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  return { ok: true, collections }
}

export async function listCollectionItems(collectionId: string): Promise<{ ok: true; items: LibraryItem[] } | LibraryFailure> {
  const { data, error } = await supabase
    .from('library_collection_items')
    .select('*')
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false })
  if (error) return fail('We could not load this collection.', error)
  const items = (data ?? []).flatMap((row) => {
    const mapped = mapLibraryItemRow(row as Record<string, unknown>)
    return mapped ? [mapped] : []
  })
  return { ok: true, items }
}

export async function removeSaved(creationId: string): Promise<{ ok: true } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user
  const { error } = await supabase.from('saves').delete().eq('user_id', user).eq('creation_id', creationId)
  if (error) return fail('We could not remove this save.', error)
  const { removeOfflinePackage } = await import('../reader/offlineReadingStore.ts')
  await removeOfflinePackage(creationId)
  return { ok: true }
}

export async function clearReadingHistory(): Promise<{ ok: true } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user
  const { error } = await supabase.from('post_reading_progress').delete().eq('user_id', user)
  if (error) return fail('We could not clear history.', error)
  return { ok: true }
}

export async function removeHistoryItem(creationId: string): Promise<{ ok: true } | LibraryFailure> {
  const user = await requireUserId()
  if (typeof user !== 'string') return user
  const { error } = await supabase
    .from('post_reading_progress')
    .delete()
    .eq('user_id', user)
    .eq('creation_id', creationId)
  if (error) return fail('We could not remove this history item.', error)
  return { ok: true }
}
