import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CountLink } from './SafeWebsite.tsx'

describe('CountLink', () => {
  it('separates count and label with visible space', () => {
    render(
      <MemoryRouter>
        <CountLink count={1} noun="follower" />
      </MemoryRouter>,
    )
    expect(screen.getByText('1 follower')).toBeInTheDocument()
  })
})
