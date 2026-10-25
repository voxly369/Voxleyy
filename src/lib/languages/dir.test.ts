import { describe, expect, it } from 'vitest'
import { contentLangProps, isRtlLang } from './dir.ts'

describe('dir', () => {
  it('detects rtl languages', () => {
    expect(isRtlLang('ar')).toBe(true)
    expect(isRtlLang('en')).toBe(false)
  })

  it('returns lang and auto dir for ltr', () => {
    expect(contentLangProps('en')).toEqual({ lang: 'en', dir: 'auto' })
  })

  it('returns rtl dir for arabic', () => {
    expect(contentLangProps('ar')).toEqual({ lang: 'ar', dir: 'rtl' })
  })
})
