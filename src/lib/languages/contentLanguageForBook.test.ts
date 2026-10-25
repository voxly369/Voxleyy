import { describe, expect, it } from 'vitest'
import { contentLanguageForBook } from './contentLanguageForBook.ts'

describe('contentLanguageForBook', () => {
  it('uses the book language for chapter content', () => {
    expect(contentLanguageForBook('ar')).toBe('ar')
  })

  it('falls back when the book language is missing', () => {
    expect(contentLanguageForBook(null)).toBe('en')
    expect(contentLanguageForBook('  ')).toBe('en')
  })

  it('reflects an updated book language', () => {
    expect(contentLanguageForBook('en')).toBe('en')
    expect(contentLanguageForBook('he')).toBe('he')
  })
})
