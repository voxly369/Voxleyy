import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.ts'
import { usernameSchema } from './schemas.ts'

export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'unknown'

type AvailabilityResult = {
  username: string
  status: 'available' | 'taken' | 'unknown'
}

export function useUsernameAvailability(username: string): UsernameAvailability {
  const valid = usernameSchema.safeParse(username).success
  const [result, setResult] = useState<AvailabilityResult | null>(null)

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void supabase.rpc('username_available', { candidate: username }).then(({ data, error }) => {
        if (cancelled) return
        if (error || typeof data !== 'boolean') {
          setResult({ username, status: 'unknown' })
          return
        }
        setResult({ username, status: data ? 'available' : 'taken' })
      })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [username, valid])

  if (!valid) return 'idle'
  if (!result || result.username !== username) return 'checking'
  return result.status
}
