import { describe, expect, it } from 'vitest'
import { mapDeleteAccountErrorMessage, mapExportErrorMessage } from './exportGuard.ts'

describe('exportGuard', () => {
  it('maps export rate limit copy', () => {
    expect(mapExportErrorMessage('You can download your data once per day.')).toContain('once per day')
  })

  it('maps delete session freshness copy', () => {
    expect(mapDeleteAccountErrorMessage('For your security, sign in again before deleting your account.')).toContain(
      'sign in again',
    )
  })

  it('maps founder delete refusal', () => {
    expect(mapDeleteAccountErrorMessage('The Founder account cannot be deleted.')).toContain('Founder')
  })
})
