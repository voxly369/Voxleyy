import { supabase } from '../supabaseClient.ts'

const SESSION_KEY = 'voxly-touch-activity-session'

export async function touchActivityOncePerSession(): Promise<void> {
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // sessionStorage unavailable; still attempt daily touch
  }
  await supabase.rpc('touch_activity')
}
