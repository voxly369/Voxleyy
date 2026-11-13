import { describe, expect, it } from 'vitest'
import {
  maturePostVisibleToViewer,
  publishBlockedWithoutMatureAck,
  viewerMaySeeMatureContent,
} from './matureContent.ts'

function adultDob(reference: Date): string {
  const d = new Date(Date.UTC(reference.getUTCFullYear() - 20, reference.getUTCMonth(), reference.getUTCDate()))
  return d.toISOString().slice(0, 10)
}

function under18Dob(reference: Date): string {
  const d = new Date(Date.UTC(reference.getUTCFullYear() - 16, reference.getUTCMonth(), reference.getUTCDate()))
  return d.toISOString().slice(0, 10)
}

const ref = new Date(Date.UTC(2026, 10, 12))

describe('matureContent', () => {
  it('blocks publish when sexual content lacks mature acknowledgment', () => {
    expect(
      publishBlockedWithoutMatureAck({
        containsSexualContent: true,
        matureContentAcknowledged: false,
      }),
    ).toMatch(/confirm mature content/i)
    expect(
      publishBlockedWithoutMatureAck({
        containsSexualContent: true,
        matureContentAcknowledged: true,
      }),
    ).toBeNull()
  })

  it('hides mature posts from under-18 viewers', () => {
    const under18 = { dateOfBirth: under18Dob(ref), showMatureContentOptIn: true }
    expect(maturePostVisibleToViewer(true, under18)).toBe(false)
    expect(viewerMaySeeMatureContent(under18)).toBe(false)
    expect(maturePostVisibleToViewer(false, under18)).toBe(true)
  })

  it('shows mature posts to opted-in viewers who are 18+ with date of birth on file', () => {
    const eligible = { dateOfBirth: adultDob(ref), showMatureContentOptIn: true }
    expect(maturePostVisibleToViewer(true, eligible)).toBe(true)
    expect(viewerMaySeeMatureContent(eligible)).toBe(true)
  })

  it('does not show mature posts when date of birth is missing', () => {
    const noDob = { dateOfBirth: null, showMatureContentOptIn: true }
    expect(maturePostVisibleToViewer(true, noDob)).toBe(false)
    expect(viewerMaySeeMatureContent(noDob)).toBe(false)
  })

  it('does not show mature posts when 18+ but opt-in is off', () => {
    const noOptIn = { dateOfBirth: adultDob(ref), showMatureContentOptIn: false }
    expect(maturePostVisibleToViewer(true, noOptIn)).toBe(false)
  })
})
