import { supabase } from '../supabaseClient.ts'

export async function fetchMyDateOfBirth(): Promise<
  { ok: true; data: string | null } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('get_my_date_of_birth')
  if (error) return { ok: false, message: error.message || 'We could not load your date of birth.' }
  if (data === null || data === undefined) return { ok: true, data: null }
  return { ok: true, data: String(data) }
}

export async function saveMyDateOfBirth(
  dateOfBirth: string,
): Promise<{ ok: true; data: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('upsert_my_date_of_birth', { p_date_of_birth: dateOfBirth })
  if (error) return { ok: false, message: error.message || 'We could not save your date of birth.' }
  return { ok: true, data: String(data) }
}
