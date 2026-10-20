import { describe, expect, it } from 'vitest'
import { publishContentStats, publishDisabledReason, validatePublishContent } from './publishValidation.ts'

describe('validatePublishContent', () => {
  it('requires a title and at least one non-empty body line', () => {
    expect(validatePublishContent({ title: '', body: 'line' }).ok).toBe(false)
    expect(validatePublishContent({ title: 'Hi', body: '   \n  ' }).ok).toBe(false)
    expect(validatePublishContent({ title: 'Hi', body: 'Hello world' }).ok).toBe(true)
  })

  it('publishDisabledReason requires a persisted draft and valid content', () => {
    expect(
      publishDisabledReason({
        title: 'Hi',
        body: 'Hello',
        hasPersistedDraft: false,
      }),
    ).toMatch(/draft/i)
    expect(
      publishDisabledReason({
        title: '',
        body: 'Hello',
        hasPersistedDraft: true,
      }),
    ).toMatch(/title/i)
    expect(
      publishDisabledReason({
        title: 'Hi',
        body: 'Hello',
        hasPersistedDraft: true,
      }),
    ).toBeNull()
  })

  it('reports word, line, and character counts', () => {
    const stats = publishContentStats('one two\nthree')
    expect(stats.words).toBe(3)
    expect(stats.lines).toBe(2)
    expect(stats.characters).toBe('one two\nthree'.length)
  })
})
