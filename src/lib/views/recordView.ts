import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { shouldRecordCreationView } from './dedupe.ts'

export type ViewRecordFailure = {
  ok: false
  error: {
    code: 'unavailable'
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type ViewRecordResult = { ok: true } | ViewRecordFailure

function fail(message: string, error?: { code?: string; status?: number }): ViewRecordFailure {
  return { ok: false, error: { code: 'unavailable', message, ...providerFields(error) } }
}

export async function recordCreationView(creationId: string): Promise<ViewRecordResult> {
  if (typeof sessionStorage !== 'undefined') {
    if (!shouldRecordCreationView(creationId, sessionStorage)) {
      return { ok: true }
    }
  }
  const { error } = await supabase.rpc('record_creation_view', { p_creation_id: creationId })
  if (error) return fail('We could not record this view.', error)
  return { ok: true }
}
