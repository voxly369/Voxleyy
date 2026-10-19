import { supabase } from '../supabaseClient.ts'

export async function savedCreationIdsForViewer(creationIds: string[]): Promise<Set<string>> {
  if (creationIds.length === 0) return new Set()
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return new Set()

  const { data, error } = await supabase
    .from('saves')
    .select('creation_id')
    .eq('user_id', userId)
    .in('creation_id', creationIds)

  if (error) return new Set()
  return new Set((data ?? []).map((row) => row.creation_id))
}
