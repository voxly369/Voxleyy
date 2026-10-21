import { describe, expect, it } from 'vitest'
import { chaptersFromPlainText } from './importManuscript.ts'

describe('importManuscript', () => {
  it('throws when manuscript has no text', () => {
    expect(() => chaptersFromPlainText('   ')).toThrow(/No text found/)
  })

  it('returns imported chapter rows with titles', () => {
    const chapters = chaptersFromPlainText('Chapter 1\n\nHello world.\n\nChapter 2\n\nMore text here with plenty of words to avoid short-chapter merging in the import pipeline.')
    expect(chapters.length).toBeGreaterThanOrEqual(1)
    expect(chapters[0]?.title).toBeTruthy()
  })
})
