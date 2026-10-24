let passwordSignInError: { code: string; message?: string } | null = null
let resendRateLimitAfterSuccess = false
let resendCount = 0

export function resetAuthMocks() {
  passwordSignInError = null
  resendRateLimitAfterSuccess = false
  resendCount = 0
}

export function setE2ePasswordSignInError(code: string, message?: string) {
  passwordSignInError = { code, message }
}

export function setE2eResendRateLimitAfterFirstSuccess(enabled: boolean) {
  resendRateLimitAfterSuccess = enabled
  resendCount = 0
}

export function authMockMaybeRejectToken(url: string, postData: unknown): { status: number; body: unknown } | null {
  if (!url.includes('/auth/v1/token')) return null
  const body = postData && typeof postData === 'object' ? (postData as Record<string, unknown>) : {}
  const grant = body.grant_type
  if (grant !== 'password' || !passwordSignInError) return null
  return {
    status: 400,
    body: {
      error: passwordSignInError.code,
      error_description: passwordSignInError.message ?? passwordSignInError.code,
      msg: passwordSignInError.message ?? passwordSignInError.code,
    },
  }
}

export function authMockMaybeRejectResend(url: string): { status: number; body: unknown } | null {
  if (!url.includes('/auth/v1/resend')) return null
  resendCount += 1
  if (resendRateLimitAfterSuccess && resendCount > 1) {
    return {
      status: 429,
      body: {
        error: 'over_email_send_rate_limit',
        error_description: 'rate limit',
        msg: 'rate limit',
      },
    }
  }
  return null
}
