import { supabase } from '../../supabaseClient.ts'

export type MfaAssurance = {
  needsChallenge: boolean
  currentLevel: string | null
  nextLevel: string | null
}

export async function fetchMfaAssurance(): Promise<MfaAssurance> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) {
    return { needsChallenge: false, currentLevel: null, nextLevel: null }
  }
  const needsChallenge = data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  return {
    needsChallenge,
    currentLevel: data.currentLevel,
    nextLevel: data.nextLevel,
  }
}
