import { describe, expect, it } from 'vitest'
import { scrubErrorPayload } from './scrubError.ts'

describe('scrubErrorPayload', () => {
  it('redacts emails and query strings in strings', () => {
    const input = 'Failed for user@example.com at https://app.test/path?token=abc&x=1'
    expect(scrubErrorPayload(input)).toBe(
      'Failed for [email-redacted] at https://app.test/path?[query-redacted]',
    )
  })

  it('redacts bearer tokens and jwt-shaped strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature'
    expect(scrubErrorPayload(`Auth Bearer secret123 and ${jwt}`)).toBe(
      'Auth Bearer [redacted] and [jwt-redacted]',
    )
  })

  it('redacts secret keys in objects recursively', () => {
    const input = {
      email: 'a@b.co',
      password: 'hunter2',
      nested: { api_key: 'sk_live', safe: 'ok' },
    }
    expect(scrubErrorPayload(input)).toEqual({
      email: '[email-redacted]',
      password: '[redacted]',
      nested: { api_key: '[redacted]', safe: 'ok' },
    })
  })
})
