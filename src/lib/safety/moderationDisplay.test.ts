import { describe, expect, it } from 'vitest'
import { appealStatusLabel, myReportStatusLabel, statusDisplay, suspensionEndDate } from './moderationDisplay.ts'

describe('moderationDisplay', () => {
  it('formats suspension end date', () => {
    const formatted = suspensionEndDate('2030-01-15T12:00:00.000Z')
    expect(formatted).toBeTruthy()
    expect(formatted).toMatch(/2030/)
  })

  it('returns null for invalid suspension date', () => {
    expect(suspensionEndDate('not-a-date')).toBeNull()
  })

  it('labels account statuses', () => {
    expect(statusDisplay('active')).toBe('Active')
    expect(statusDisplay('suspended')).toBe('Suspended')
    expect(statusDisplay('banned')).toBe('Banned')
  })

  it('myReportStatusLabel maps open to Sent and closed to Reviewed', () => {
    expect(myReportStatusLabel('open')).toBe('Sent')
    expect(myReportStatusLabel('dismissed')).toBe('Reviewed')
    expect(myReportStatusLabel('actioned')).toBe('Reviewed')
  })

  it('appealStatusLabel labels appeal rows', () => {
    expect(appealStatusLabel('pending')).toBe('Pending review')
    expect(appealStatusLabel('decided')).toBe('Decided')
  })
})
