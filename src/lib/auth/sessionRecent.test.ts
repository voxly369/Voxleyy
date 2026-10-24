import { describe, expect, it } from 'vitest'
import { isAuthSessionRecent, readAccessTokenIat } from './sessionRecent.ts'

function fakeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.sig`
}

describe('sessionRecent', () => {
  it('reads iat from access token', () => {
    const token = fakeToken({ iat: 1_700_000_000 })
    expect(readAccessTokenIat(token)).toBe(1_700_000_000)
  })

  it('treats fresh sessions as recent', () => {
    const now = 1_700_000_000
    const token = fakeToken({ iat: now - 60 })
    expect(isAuthSessionRecent(token, 15 * 60, now)).toBe(true)
  })

  it('treats stale sessions as not recent', () => {
    const now = 1_700_000_000
    const token = fakeToken({ iat: now - 16 * 60 })
    expect(isAuthSessionRecent(token, 15 * 60, now)).toBe(false)
  })
})
