import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState.tsx'

describe('EmptyState', () => {
  it('renders title, message, and optional action', () => {
    render(
      <EmptyState
        title="Nothing here yet"
        message="When you save posts, they will appear in this list."
        action={<button type="button">Browse Discover</button>}
      />,
    )
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.getByText(/When you save posts/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse Discover' })).toBeInTheDocument()
  })
})
