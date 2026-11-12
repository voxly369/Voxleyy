import { describe, expect, it } from 'vitest'
import {
  maturePostVisibleToViewer,
  publishBlockedWithoutMatureAck,
  viewerMaySeeMatureContent,
} from './matureContent.ts'

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
    const under18 = { confirmedAge18: false, showMatureContentOptIn: false }
    expect(maturePostVisibleToViewer(true, under18)).toBe(false)
    expect(viewerMaySeeMatureContent(under18)).toBe(false)
    expect(maturePostVisibleToViewer(false, under18)).toBe(true)
  })

  it('shows mature posts to opted-in 18+ viewers', () => {
    const eligible = { confirmedAge18: true, showMatureContentOptIn: true }
    expect(maturePostVisibleToViewer(true, eligible)).toBe(true)
    expect(viewerMaySeeMatureContent(eligible)).toBe(true)
  })

  it('does not show mature posts when 18+ but opt-in is off', () => {
    const noOptIn = { confirmedAge18: true, showMatureContentOptIn: false }
    expect(maturePostVisibleToViewer(true, noOptIn)).toBe(false)
  })
})
