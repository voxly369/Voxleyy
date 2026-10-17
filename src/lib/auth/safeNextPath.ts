const DUMMY_ORIGIN = 'https://voxly.local'

function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 31 || code === 127) return true
  }
  return false
}

// Only a same-origin relative path that starts with a single "/" may be used
// after sign-in. Anything else is ignored so a login link cannot leave the app.
export function safeNextPath(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null
  if (input.length === 0 || input.length > 2048) return null
  if (!input.startsWith('/') || input.startsWith('//') || input.startsWith('/\\')) return null
  if (input.includes('\\') || input.includes('://')) return null
  if (hasControlChar(input)) return null
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(input)) return null

  const lowered = input.toLowerCase()
  if (lowered.startsWith('/%2f') || lowered.startsWith('/%5c')) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(input)
  } catch {
    return null
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  if (decoded.includes('\\') || decoded.includes('://')) return null
  if (hasControlChar(decoded)) return null
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(decoded)) return null

  try {
    const url = new URL(input, DUMMY_ORIGIN)
    if (url.origin !== DUMMY_ORIGIN) return null
    if (url.username || url.password) return null
    if (!url.pathname.startsWith('/') || url.pathname.startsWith('//')) return null
    if (url.pathname.includes('\\')) return null
  } catch {
    return null
  }

  return input
}
