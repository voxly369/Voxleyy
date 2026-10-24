import { supabase } from '../supabaseClient.ts'

export async function exportMyData(): Promise<{ ok: true; payload: unknown } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('export_my_data')
  if (error) return { ok: false, message: 'We could not prepare your export. Try again in a moment.' }
  return { ok: true, payload: data }
}

export async function deleteMyAccount(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { ok: false, message: 'We could not delete your account. Try again or contact support.' }
  return { ok: true }
}

export function downloadJsonExport(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
