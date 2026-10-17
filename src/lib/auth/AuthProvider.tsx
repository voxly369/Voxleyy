import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient.ts'
import { AuthContext, type AuthResult, type SignUpInput } from './auth-context.ts'
import { ACCOUNT_LOAD_FAILED, RATE_LIMITED } from './messages.ts'
import { fetchIsFounder, fetchOwnProfile, type OwnProfile } from './profile.ts'

function redirectTo(path: string): string {
  return new URL(path, window.location.origin).toString()
}

function authResult(error: { code?: string } | null): AuthResult {
  if (!error) return { ok: true }
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return { ok: false, message: RATE_LIMITED }
  }
  return { ok: false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<OwnProfile | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [isFounder, setIsFounder] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionEnded, setSessionEnded] = useState(false)
  const signingOut = useRef(false)
  const profileRequest = useRef(0)

  const loadProfile = useCallback(async (userId: string) => {
    const request = profileRequest.current + 1
    profileRequest.current = request
    const [nextProfile, founder] = await Promise.all([fetchOwnProfile(userId), fetchIsFounder()])
    if (profileRequest.current !== request) return
    setProfile(nextProfile)
    setProfileUserId(userId)
    setIsFounder(Boolean(nextProfile) && founder)
    setError(nextProfile ? null : ACCOUNT_LOAD_FAILED)
  }, [])

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(ACCOUNT_LOAD_FAILED)
      setSession(data.session)
      setReady(true)
    })

    // Do not await Supabase calls inside this callback. A waiting call here
    // deadlocks the auth client. Profile loading happens in the effect below.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setProfileUserId(null)
        setIsFounder(false)
        const intentional = signingOut.current
        signingOut.current = false
        if (!intentional) setSessionEnded(true)
        return
      }
      setSession(nextSession)
      if (nextSession) setSessionEnded(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!ready || !userId) return
    void loadProfile(userId)
  }, [ready, userId, loadProfile])

  useEffect(() => {
    if (!sessionEnded) return
    navigate('/login?notice=session', { replace: true })
  }, [sessionEnded, navigate])

  const signUp = useCallback(async (input: SignUpInput): Promise<AuthResult> => {
    const { error: signUpError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { username: input.username },
        emailRedirectTo: redirectTo('/auth/callback'),
      },
    })
    return authResult(signUpError)
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    return signInError ? { ok: false } : { ok: true }
  }, [])

  const signOut = useCallback(async () => {
    signingOut.current = true
    profileRequest.current += 1
    setSession(null)
    setProfile(null)
    setProfileUserId(null)
    setIsFounder(false)
    setError(null)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) await supabase.auth.signOut({ scope: 'local' })
    navigate('/login', { replace: true })
  }, [navigate])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo('/auth/callback'),
    })
    return authResult(resetError)
  }, [])

  const resendConfirmation = useCallback(async (email: string): Promise<AuthResult> => {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo('/auth/callback') },
    })
    return authResult(resendError)
  }, [])

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error: updateError } = await supabase.auth.updateUser({ password })
    return updateError ? { ok: false } : { ok: true }
  }, [])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id
    if (!userId) return
    await loadProfile(userId)
  }, [loadProfile, session?.user.id])

  const profileReady = userId !== null && profileUserId === userId
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: profileReady ? profile : null,
      loading: !ready || (userId !== null && !profileReady),
      error,
      sessionNotice: sessionEnded,
      isFounder: profileReady ? isFounder : false,
      signUp,
      signIn,
      signOut,
      resetPassword,
      resendConfirmation,
      updatePassword,
      refreshProfile,
    }),
    [
      session,
      profile,
      profileReady,
      ready,
      userId,
      error,
      sessionEnded,
      isFounder,
      signUp,
      signIn,
      signOut,
      resetPassword,
      resendConfirmation,
      updatePassword,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
