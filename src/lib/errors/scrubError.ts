const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const BEARER_RE = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
const QUERY_RE = /\?[^#\s'"]+/g

const SECRET_KEY_RE =
  /^(password|passwd|secret|token|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|service[_-]?role|anon[_-]?key)$/i

function scrubString(value: string): string {
  let next = value
  next = next.replace(BEARER_RE, 'Bearer [redacted]')
  next = next.replace(JWT_RE, '[jwt-redacted]')
  next = next.replace(EMAIL_RE, '[email-redacted]')
  next = next.replace(QUERY_RE, '?[query-redacted]')
  return next
}

export function scrubErrorPayload<T>(input: T): T {
  if (input === null || input === undefined) return input
  if (typeof input === 'string') return scrubString(input) as T
  if (typeof input === 'number' || typeof input === 'boolean') return input
  if (Array.isArray(input)) {
    return input.map((item) => scrubErrorPayload(item)) as T
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(key)) {
        out[key] = '[redacted]'
      } else {
        out[key] = scrubErrorPayload(value)
      }
    }
    return out as T
  }
  return input
}
