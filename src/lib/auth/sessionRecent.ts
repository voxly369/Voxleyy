const DEFAULT_MAX_AGE_SECONDS = 15 * 60

function base64UrlToJson(segment: string): unknown | null {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (padded.length % 4)) % 4
  const base64 = padded + '='.repeat(padLen)
  if (typeof atob !== 'function') return null
  return JSON.parse(atob(base64)) as unknown
}

/** Read issued-at (seconds) from a Supabase access token JWT payload. */
export function readAccessTokenIat(accessToken: string | null | undefined): number | null {
  if (!accessToken) return null
  const parts = accessToken.split('.')
  if (parts.length < 2) return null
  try {
    const payload = base64UrlToJson(parts[1]!)
    if (payload === null || typeof payload !== 'object') return null
    const iat = (payload as { iat?: unknown }).iat
    return typeof iat === 'number' && Number.isFinite(iat) ? iat : null
  } catch {
    return null
  }
}

/** Client-side mirror of `auth_session_recent` for UX hints (server still enforces). */
export function isAuthSessionRecent(
  accessToken: string | null | undefined,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const iat = readAccessTokenIat(accessToken)
  if (iat === null) return false
  return nowSeconds - iat <= maxAgeSeconds
}
