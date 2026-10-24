import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HomeGreeting } from './HomeGreeting.tsx'

describe('HomeGreeting', () => {
  it('shows country flag and name when provided', () => {
    render(
      <MemoryRouter>
        <HomeGreeting
          displayName="Sam"
          timezone="UTC"
          countryCode="ZA"
          role="reader"
          writingStreak={null}
          dailyPrompt={null}
          dailyQuote={{ text: 'Quiet ink.', author: 'Voxly' }}
          continueReadingCount={0}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-greeting-country')).toHaveTextContent('South Africa')
  })
})
