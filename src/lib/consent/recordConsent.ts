import { supabase } from '../supabaseClient.ts'
import type { LegalDocumentKey } from '../../config/organization.ts'

export type ConsentRecord = {
  document: LegalDocumentKey
  version: string
}

export async function recordUserConsents(
  records: ConsentRecord[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const record of records) {
    const { error } = await supabase.rpc('record_user_consent', {
      p_document: record.document,
      p_version: record.version,
    })
    if (error) return { ok: false, message: error.message || 'Could not record consent.' }
  }
  return { ok: true }
}
