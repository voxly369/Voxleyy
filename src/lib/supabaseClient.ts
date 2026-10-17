import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// TODO: When the Supabase CLI and Docker are available, generate types with
// `supabase gen types typescript --local > src/types/database.ts`
// and change this client to createClient<Database>(...). Do not hand-write a Database type.
// Never use the service-role key here, and never put a secret in a VITE_ variable.

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set the anon key only.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
