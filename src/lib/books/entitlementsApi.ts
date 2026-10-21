import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import type { BookApiFailure, BookApiResult } from './booksApi.ts'
import type { BookEntitlementKind } from './bookSchema.ts'

function fail(code: BookApiFailure['error']['code'], message: string, error?: { code?: string; message?: string }): BookApiFailure {
  const messageText = error?.message?.trim() || message
  return { ok: false, error: { code, message: messageText, ...providerFields(error) } }
}

export type BookEntitlement = {
  id: string
  bookId: string
  kind: BookEntitlementKind
  startsAt: string
  expiresAt: string | null
}

export async function claimFreeBook(bookId: string): Promise<BookApiResult<string>> {
  const { data, error } = await supabase.rpc('claim_free_book', { p_book_id: bookId })
  if (error) return fail('unavailable', 'We could not add this book to your library.', error)
  return { ok: true, data: String(data) }
}

export async function userHasBookEntitlement(bookId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return false
  const { data, error } = await supabase.rpc('user_has_book_entitlement', { p_user: userId, p_book: bookId })
  if (error) return false
  return Boolean(data)
}

export async function listMyEntitlementsForBook(bookId: string): Promise<BookApiResult<BookEntitlement[]>> {
  const { data, error } = await supabase
    .from('book_entitlements')
    .select('id, book_id, kind, starts_at, expires_at')
    .eq('book_id', bookId)
    .order('starts_at', { ascending: false })
  if (error) return fail('unavailable', 'We could not load entitlements.', error)
  const rows: BookEntitlement[] = (data ?? []).map((row) => ({
    id: String(row.id),
    bookId: String(row.book_id),
    kind: row.kind as BookEntitlementKind,
    startsAt: String(row.starts_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  }))
  return { ok: true, data: rows }
}
