import { describe, expect, it } from 'vitest'
import { detectChapterBreaks, mergeShortChapters } from './chapterBreakDetection.ts'

describe('detectChapterBreaks', () => {
  it('splits on chapter headings', () => {
    const text = 'Intro line\n\nChapter 2: The road\n\nBody two'
    const chapters = detectChapterBreaks(text)
    expect(chapters.length).toBeGreaterThanOrEqual(2)
    expect(chapters.some((c) => /road/i.test(c.title))).toBe(true)
  })

  it('returns one chapter when no headings', () => {
    const chapters = detectChapterBreaks('Only one block of text here.')
    expect(chapters).toHaveLength(1)
    expect(chapters[0]?.title).toBe('Chapter 1')
  })
})

describe('mergeShortChapters', () => {
  it('merges tiny sections into the previous chapter', () => {
    const merged = mergeShortChapters([
      { title: 'One', body: 'word '.repeat(50), lineIndex: 0 },
      { title: 'Two', body: 'tiny', lineIndex: 1 },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.body).toContain('tiny')
  })
})
