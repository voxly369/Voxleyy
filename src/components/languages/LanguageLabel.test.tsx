import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PostLanguageLabel } from './PostLanguageLabel.tsx'

describe('PostLanguageLabel', () => {
  afterEach(() => cleanup())
  it('shows when post language differs from viewer preferences', () => {
    render(<PostLanguageLabel postLanguage="ar" viewerLanguages={['en']} />)
    expect(screen.getByTestId('post-language-label')).toBeInTheDocument()
  })

  it('hides when post language matches viewer preferences', () => {
    render(<PostLanguageLabel postLanguage="en" viewerLanguages={['en', 'af']} />)
    expect(screen.queryByTestId('post-language-label')).toBeNull()
  })
})
