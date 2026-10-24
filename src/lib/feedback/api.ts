import { supabase } from '../supabaseClient.ts'

export async function submitAppFeedback(input: {
  category: string
  message: string
  pagePath?: string | null
  appVersion?: string | null
  viewport?: string | null
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('submit_app_feedback', {
    p_category: input.category,
    p_message: input.message,
    p_page_path: input.pagePath ?? undefined,
    p_app_version: input.appVersion ?? undefined,
    p_viewport: input.viewport ?? undefined,
  })
  if (error) {
    const msg = error.message ?? 'We could not send your feedback. Try again.'
    return { ok: false, message: msg }
  }
  return { ok: true, id: Number(data) }
}
