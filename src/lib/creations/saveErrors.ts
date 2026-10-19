export type SaveErrorLike = {
  code?: string
  message?: string
  status?: number
}

export const SIGN_IN_AGAIN_SAVE_MESSAGE = 'Sign in again to keep saving.'

const AUTH_SESSION_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303'])

export function isAuthSessionSaveError(error: SaveErrorLike | null | undefined): boolean {
  const code = error?.code ?? ''
  return AUTH_SESSION_CODES.has(code)
}

export function isTransientSaveError(error: SaveErrorLike | null | undefined): boolean {
  if (!error) return true
  const message = (error.message ?? '').toLowerCase()
  const code = error.code ?? ''

  if (isAuthSessionSaveError(error)) return false
  if (code.startsWith('PGRST')) return false

  if (code === '23514' || code === '23505' || code === '42501' || code === 'P0001') return false
  if (message.includes('too many tags') || message.includes('too fast') || message.includes('too long')) {
    return false
  }
  if (message.includes('forbidden') || message.includes('policy') || message.includes('permission')) {
    return false
  }
  if (message.includes('invalid') || message.includes('validation')) return false

  if (typeof error.status === 'number') {
    if (error.status >= 500) return true
    if (error.status >= 400 && error.status < 500) return false
  }

  if (code === '' && (message.includes('network') || message.includes('fetch') || message.includes('timeout'))) {
    return true
  }

  if (code === 'ECONNRESET' || message.includes('failed to fetch')) return true

  return false
}

export function saveErrorMessage(error: SaveErrorLike | null | undefined, fallback: string): string {
  if (isAuthSessionSaveError(error)) return SIGN_IN_AGAIN_SAVE_MESSAGE
  if (!error?.message) return fallback
  return error.message
}
