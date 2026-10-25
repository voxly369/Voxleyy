/** Shared security headers for Render static deploy and Vite preview (keep in sync with render.yaml). */

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://ktgxdqplvggeyrnuqljx.supabase.co",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self' https://ktgxdqplvggeyrnuqljx.supabase.co wss://ktgxdqplvggeyrnuqljx.supabase.co https://api.dictionaryapi.dev",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

export const PERMISSIONS_POLICY =
  'camera=(), microphone=(), geolocation=(), payment=(), usb=()'

/** Headers applied to all paths unless overridden. */
export const GLOBAL_SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': CSP,
}

export const INDEX_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache',
}

export const ASSET_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=31536000, immutable',
}

export function headersForPath(pathname: string): Record<string, string> {
  const path = pathname.split('?')[0] ?? pathname
  if (path.startsWith('/assets/')) {
    return { ...GLOBAL_SECURITY_HEADERS, ...ASSET_CACHE_HEADERS }
  }
  if (path === '/' || path.endsWith('.html') || !path.includes('.')) {
    return { ...GLOBAL_SECURITY_HEADERS, ...INDEX_CACHE_HEADERS }
  }
  return { ...GLOBAL_SECURITY_HEADERS }
}

/** Canonical list for drift tests against render.yaml. */
export const RENDER_HEADER_SPEC = {
  global: GLOBAL_SECURITY_HEADERS,
  indexCache: INDEX_CACHE_HEADERS,
  assetCache: ASSET_CACHE_HEADERS,
} as const
