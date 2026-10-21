import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { clampPercent, isReadingCompleted } from './progressRules.ts'

export async function fetchPostProgress(creationId: string): Promise<{
  percent: number
  position: number
  completed: boolean
} | null> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return null
  const { data } = await supabase
    .from('post_reading_progress')
    .select('percent, position, completed')
    .eq('user_id', userId)
    .eq('creation_id', creationId)
    .maybeSingle()
  if (!data) return null
  return {
    percent: data.percent,
    position: data.position,
    completed: data.completed,
  }
}

export async function upsertPostProgress(input: {
  creationId: string
  percent: number
  position: number
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return
  const percent = clampPercent(input.percent)
  const completed = isReadingCompleted(percent)
  const { error } = await supabase.from('post_reading_progress').upsert(
    {
      user_id: userId,
      creation_id: input.creationId,
      percent,
      position: Math.max(0, input.position),
      completed,
    },
    { onConflict: 'user_id,creation_id' },
  )
  if (error) {
    console.warn('progress save failed', providerFields(error))
  }
}
