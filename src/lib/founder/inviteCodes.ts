import { supabase } from '../supabaseClient.ts'

export type FounderInviteCodeRow = {
  code: string
  max_uses: number
  uses: number
  expires_at: string | null
  revoked: boolean
  created_at: string
  note: string | null
}

export async function founderListInviteCodes(): Promise<
  { ok: true; rows: FounderInviteCodeRow[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('founder_list_invite_codes')
  if (error) return { ok: false, message: error.message || 'Could not load invite codes.' }
  if (!Array.isArray(data)) return { ok: true, rows: [] }
  const rows: FounderInviteCodeRow[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const code = typeof row.code === 'string' ? row.code : null
    if (!code) continue
    rows.push({
      code,
      max_uses: typeof row.max_uses === 'number' ? row.max_uses : 0,
      uses: typeof row.uses === 'number' ? row.uses : 0,
      expires_at: typeof row.expires_at === 'string' ? row.expires_at : null,
      revoked: row.revoked === true,
      created_at: typeof row.created_at === 'string' ? row.created_at : '',
      note: typeof row.note === 'string' ? row.note : null,
    })
  }
  return { ok: true, rows }
}

export async function founderRevokeInviteCode(code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('founder_revoke_invite_code', { p_code: code })
  if (error) return { ok: false, message: error.message || 'Could not revoke that code.' }
  return { ok: true }
}
