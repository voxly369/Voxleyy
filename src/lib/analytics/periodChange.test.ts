import { describe, expect, it } from 'vitest'
import { formatPeriodChange, periodOverPeriodChange } from './periodChange.ts'

describe('periodOverPeriodChange', () => {
  it('computes ratio', () => {
    expect(periodOverPeriodChange(15, 10)).toBe(0.5)
  })

  it('returns null when previous is zero and current positive', () => {
    expect(periodOverPeriodChange(3, 0)).toBeNull()
  })

  it('formatPeriodChange includes sign', () => {
    expect(formatPeriodChange(0.25)).toBe('+25% vs prior period')
  })
})
