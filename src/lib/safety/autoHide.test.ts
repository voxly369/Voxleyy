import { describe, expect, it } from 'vitest'
import {
  distinctCreationReporters,
  flaggedPostCount,
  shouldAutoHideDistinctReports,
  shouldIssueAutoHideFinalWarning,
} from './autoHide.ts'

const AUTHOR = 'author-1'
const CREATION = 'creation-1'

describe('autoHide', () => {
  it('counts distinct reporters for a creation', () => {
    const count = distinctCreationReporters(
      [
        { reporterId: 'r1', authorId: AUTHOR, creationId: CREATION },
        { reporterId: 'r2', authorId: AUTHOR, creationId: CREATION },
      ],
      CREATION,
      AUTHOR,
    )
    expect(count).toBe(2)
  })

  it('excludes the author own report from the count', () => {
    const count = distinctCreationReporters(
      [{ reporterId: AUTHOR, authorId: AUTHOR, creationId: CREATION }],
      CREATION,
      AUTHOR,
    )
    expect(count).toBe(0)
  })

  it('counts each reporter once when duplicate rows would exist', () => {
    const count = distinctCreationReporters(
      [
        { reporterId: 'r1', authorId: AUTHOR, creationId: CREATION },
        { reporterId: 'r1', authorId: AUTHOR, creationId: CREATION },
      ],
      CREATION,
      AUTHOR,
    )
    expect(count).toBe(1)
  })

  it('auto-hides at threshold 3 not below', () => {
    expect(shouldAutoHideDistinctReports(2)).toBe(false)
    expect(shouldAutoHideDistinctReports(3)).toBe(true)
    expect(shouldAutoHideDistinctReports(4)).toBe(true)
  })

  it('counts flagged posts once each for final warning', () => {
    const count = flaggedPostCount([
      { creationId: 'a', kind: 'auto_hide' },
      { creationId: 'a', kind: 'auto_hide' },
      { creationId: 'b', kind: 'auto_hide' },
    ])
    expect(count).toBe(2)
    expect(shouldIssueAutoHideFinalWarning(count)).toBe(false)
    expect(
      shouldIssueAutoHideFinalWarning(
        flaggedPostCount([
          { creationId: 'a', kind: 'auto_hide' },
          { creationId: 'b', kind: 'auto_hide' },
          { creationId: 'c', kind: 'auto_hide' },
        ]),
      ),
    ).toBe(true)
  })

  it('final warning does not imply suspension (no suspend helper)', () => {
    expect(shouldIssueAutoHideFinalWarning(3)).toBe(true)
  })
})
