import { describe, expect, it } from 'vitest'
import { languageFilterEmptyMessage, shouldShowPostLanguageLabel } from './showPostLanguageLabel.ts'

describe('shouldShowPostLanguageLabel', () => {
  it('hides when post language is in viewer preferences', () => {
    expect(shouldShowPostLanguageLabel('en', ['en', 'af'])).toBe(false)
  })

  it('shows when post language differs from viewer preferences', () => {
    expect(shouldShowPostLanguageLabel('ar', ['en'])).toBe(true)
  })
})

describe('languageFilterEmptyMessage', () => {
  it('mentions languages when filters are active', () => {
    expect(languageFilterEmptyMessage(true, 'browse')).toMatch(/languages/i)
    expect(languageFilterEmptyMessage(true, 'search')).toMatch(/languages/i)
  })
})
