import { describe, expect, it } from 'vitest'
import { detectChapterBreaks } from './chapterBreakDetection.ts'
import { enforceManuscriptLimits, sanitizeManuscriptText } from './manuscriptSanitize.ts'

describe('manuscriptSanitize', () => {
  it('strips control characters', () => {
    expect(sanitizeManuscriptText('Hello\u0000world')).toBe('Helloworld')
  })

  it('enforces chapter limits', () => {
    const err = enforceManuscriptLimits('x', 201)
    expect(err).toMatch(/Too many chapters/)
  })

  it('detects chapter headings in plain text', () => {
    const text = 'Chapter 1\n\nBody one.\n\nChapter 2\n\nBody two.'
    const chapters = detectChapterBreaks(sanitizeManuscriptText(text))
    expect(chapters.length).toBe(2)
    expect(chapters[0]?.title).toMatch(/Chapter/i)
  })
})
