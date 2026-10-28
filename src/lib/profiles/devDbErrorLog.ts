/** Logs Supabase/PostgREST error codes in development only (hotfix diagnostics). */
export function logDevDbError(context: string, error: { code?: string; message?: string } | null | undefined) {
  if (!import.meta.env.DEV || !error) return
  console.error(`[${context}]`, error.code ?? '(no code)', error.message ?? '')
}
