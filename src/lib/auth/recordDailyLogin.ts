import { supabase } from '../supabaseClient.ts'

/** Upserts one login row per user per Johannesburg calendar day (server RPC). */
export async function recordDailyLogin(): Promise<void> {
  const { error } = await supabase.rpc('record_daily_login')
  if (error) {
    console.warn('record_daily_login failed', error.message)
  }
}
