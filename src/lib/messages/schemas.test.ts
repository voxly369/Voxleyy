import { describe, expect, it } from 'vitest'
import { messageBodySchema, whoCanMessageSchema } from './schemas.ts'

describe('message schemas', () => {
  it('accepts subscribers privacy', () => {
    expect(whoCanMessageSchema.parse('subscribers')).toBe('subscribers')
  })

  it('rejects empty bodies', () => {
    expect(messageBodySchema.safeParse('   ').success).toBe(false)
  })
})
