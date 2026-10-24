import { LOGIN_FAILED, RATE_LIMITED, SIGNUP_FAILED } from '../auth/messages.ts'

export type AuthErrorLike = {
  code?: string
  message?: string
  status?: number
}

const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: LOGIN_FAILED,
  invalid_grant: LOGIN_FAILED,
  user_not_found: LOGIN_FAILED,
  email_not_confirmed: 'Please confirm your email first.',
  user_already_registered:
    'We could not create an account with those details. If you already joined, try signing in.',
  signup_disabled: 'Sign-ups are closed right now.',
  weak_password: 'Choose a stronger password.',
  over_email_send_rate_limit: RATE_LIMITED,
  over_request_rate_limit: RATE_LIMITED,
  same_password: 'Choose a password you have not used before.',
  session_not_found: 'Your session ended. Sign in again.',
  flow_state_expired: 'That link expired. Request a new one.',
  otp_expired: 'That code expired. Request a new one.',
}

export function mapAuthError(error: AuthErrorLike | null | undefined, fallback = SIGNUP_FAILED): string {
  if (!error) return fallback
  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code]
  if (error.status === 429) return RATE_LIMITED
  return fallback
}
