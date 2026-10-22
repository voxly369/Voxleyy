import { describe, expect, it } from 'vitest'
import { parseQuietStatus, quietPromptMessage, shouldShowConsiderateModal } from './quietPrompt.ts'

describe('quietPrompt', () => {
  it('parses quiet status', () => {
    const status = parseQuietStatus({ on: true, label: '08:30', ends_at: '2026-01-01T08:30:00Z' })
    expect(status?.on).toBe(true)
    expect(shouldShowConsiderateModal(status)).toBe(true)
  })

  it('builds considerate copy', () => {
    const message = quietPromptMessage({ on: true, endsAt: null, label: 'Quiet mode is on' }, 'Ada')
    expect(message).toContain('Ada')
    expect(message).toContain('inbox')
  })
})
