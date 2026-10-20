import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CountLink } from './SafeWebsite.tsx'

describe('CountLink', () => {
  it('separates count and label with visible space', () => {
    render(
      <MemoryRouter>
        <CountLink count={0} label="followers" />
      </MemoryRouter>,
    )
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('followers')).toBeInTheDocument()
    const row = screen.getByText('0').parentElement
    expect(row?.textContent).toMatch(/0\s+followers/)
  })
})
