import { describe, expect, it } from 'vitest'
import { publishContentStats, validatePublishContent } from './publishValidation.ts'

describe('validatePublishContent', () => {
  it('requires a title and at least one non-empty body line', () => {
    expect(validatePublishContent({ title: '', body: 'line' }).ok).toBe(false)
    expect(validatePublishContent({ title: 'Hi', body: '   \n  ' }).ok).toBe(false)
    expect(validatePublishContent({ title: 'Hi', body: 'Hello world' }).ok).toBe(true)
  })

  it('reports word, line, and character counts', () => {
    const stats = publishContentStats('one two\nthree')
    expect(stats.words).toBe(3)
    expect(stats.lines).toBe(2)
    expect(stats.characters).toBe('one two\nthree'.length)
  })
})
