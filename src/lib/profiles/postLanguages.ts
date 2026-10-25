import { supabase } from '../supabaseClient.ts'

export async function listAuthorPostLanguages(authorId: string): Promise<
  { ok: true; languages: string[] } | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc('list_author_post_languages', { p_author_id: authorId })
  if (error) return { ok: false, message: 'We could not load languages for this profile.' }
  const languages = Array.isArray(data) ? data.filter((code): code is string => typeof code === 'string') : []
  return { ok: true, languages }
}
