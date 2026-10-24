import { describe, expect, it } from 'vitest'
import { cohortReturnRate, cohortRowsFromPayload } from './cohortTable.ts'

describe('cohortTable', () => {
  it('cohortRowsFromPayload parses weeks', () => {
    const rows = cohortRowsFromPayload([{ week_start: '2026-01-06', signups: 10, day1_returns: 2, day7_returns: 4 }])
    expect(rows[0]?.signups).toBe(10)
  })

  it('cohortReturnRate formats percent', () => {
    expect(cohortReturnRate(2, 10)).toBe('20%')
  })
})
