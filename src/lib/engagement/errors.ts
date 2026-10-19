import { isAuthSessionSaveError } from '../creations/saveErrors.ts'

const SLOW_DOWN = 'You are posting too fast. Slow down and try again.'
const PERMISSION = 'You do not have permission to do that.'
const GENERIC = 'Something went wrong. Try again.'
const SIGN_IN = 'Sign in again to continue.'

const ALLOWED_TRIGGER_MESSAGES = [
  'too many tags',
  'too fast',
  'too long',
  'comment cannot be empty',
  'liking too fast',
  'saving too fast',
  'commenting too fast',
]

export function engagementErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  fallback = GENERIC,
): string {
  if (isAuthSessionSaveError(error)) return 'Sign in again to continue.'
  const code = error?.code ?? ''
  const msg = (error?.message ?? '').toLowerCase()

  if (code === '42501' || msg.includes('permission') || msg.includes('policy')) return PERMISSION
  if (code === '23514' || code === 'P0001') {
    if (ALLOWED_TRIGGER_MESSAGES.some((needle) => msg.includes(needle))) {
      return error?.message ?? fallback
    }
    return fallback
  }
  if (msg.includes('too fast') || msg.includes('slow down')) return SLOW_DOWN

  if (error?.message && ALLOWED_TRIGGER_MESSAGES.some((needle) => msg.includes(needle))) {
    return error.message
  }

  return fallback
}

export function isEngagementRateOrPolicyError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = error?.code ?? ''
  const msg = (error?.message ?? '').toLowerCase()
  if (code === '42501' || code === '23514' || code === 'P0001') return true
  if (msg.includes('too fast')) return true
  return false
}

export const engagementMessages = {
  slowDown: SLOW_DOWN,
  permission: PERMISSION,
  generic: GENERIC,
  signIn: SIGN_IN,
} as const
