import type { Json } from '../database.types.ts'
import { supabase } from '../supabaseClient.ts'
import { scrubErrorPayload } from './scrubError.ts'

export type ClientErrorReport = {
  message: string
  name?: string
  stack?: string
  componentStack?: string
  route?: string
  context?: Record<string, unknown>
}

/**
 * Optional third-party error reporting (Sentry, etc.). Intentionally a no-op until wired.
 * Call from reportClientError after scrubbing if you add a vendor SDK.
 */
export function reportErrorToThirdParty(_report: ClientErrorReport): void {
  // no-op — document hook point for production observability
}

export async function reportClientError(report: ClientErrorReport): Promise<void> {
  const scrubbed = scrubErrorPayload(report)
  reportErrorToThirdParty(scrubbed)

  try {
    await supabase.rpc('report_client_error', {
      p_message: scrubbed.message,
      p_name: scrubbed.name ?? null,
      p_stack: scrubbed.stack ?? null,
      p_component_stack: scrubbed.componentStack ?? null,
      p_route: scrubbed.route ?? null,
      p_context: (scrubbed.context ?? null) as Json | null,
    })
  } catch {
    // Never throw from client error reporting.
  }
}
