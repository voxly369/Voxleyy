import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTENT_LANGUAGE, resolveDefaultContentLanguage } from './defaultLanguage.ts'

describe('defaultLanguage', () => {
  it('defaults to English', () => {
    expect(DEFAULT_CONTENT_LANGUAGE).toBe('en')
    expect(resolveDefaultContentLanguage(null)).toBe('en')
    expect(resolveDefaultContentLanguage(undefined)).toBe('en')
  })

  it('uses first preferred language when known', () => {
    expect(resolveDefaultContentLanguage(['af', 'en'])).toBe('af')
  })

  it('falls back when preference is unknown', () => {
    expect(resolveDefaultContentLanguage(['xx'])).toBe('en')
  })
})
