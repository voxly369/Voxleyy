import { describe, expect, it } from 'vitest'
import { mapUiTargetToDb, parseReportInput, reportSchema } from './reportSchema.ts'

describe('reportSchema', () => {
  it('maps post to creation', () => {
    expect(mapUiTargetToDb('post')).toBe('creation')
  })

  it('accepts valid report input', () => {
    const parsed = reportSchema.parse({
      targetType: 'post',
      targetId: '00000000-0000-0000-0000-000000000001',
      reason: 'spam',
      details: '  hello  ',
    })
    expect(parsed.details).toBe('hello')
  })

  it('rejects details over 500 characters', () => {
    const result = parseReportInput({
      targetType: 'comment',
      targetId: '00000000-0000-4000-8000-000000000002',
      reason: 'other',
      details: 'x'.repeat(501),
    })
    expect(result.ok).toBe(false)
  })
})
