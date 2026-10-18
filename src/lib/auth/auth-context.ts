import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { OwnProfile } from './profile.ts'

export type AuthResult = { ok: true } | { ok: false; message?: string }

export type SignUpInput = {
  email: string
  password: string
  username: string
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: OwnProfile | null
  loading: boolean
  error: string | null
  sessionNotice: boolean
  isFounder: boolean
  signUp: (input: SignUpInput) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  resendConfirmation: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
