import { describe, expect, it } from 'vitest'
import { countWordsInChapterBody, countWordsInPlainText } from './wordCount.ts'

describe('wordCount', () => {
  it('counts words in plain text', () => {
    expect(countWordsInPlainText('one two three')).toBe(3)
    expect(countWordsInPlainText('   ')).toBe(0)
  })

  it('counts from chapter body json fallback', () => {
    expect(
      countWordsInChapterBody(null, {
        version: 1,
        format: 'rich',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }],
      }),
    ).toBe(2)
  })
})
