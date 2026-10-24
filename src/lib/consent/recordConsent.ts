import { supabase } from '../supabaseClient.ts'
import type { LegalDocumentKey } from '../../config/organization.ts'

export type ConsentRecord = {
  document: LegalDocumentKey
  version: string
}

export async function recordUserConsents(records: ConsentRecord[]): Promise<void> {
  for (const record of records) {
    await supabase.rpc('record_user_consent', {
      p_document: record.document,
      p_version: record.version,
    })
  }
}
