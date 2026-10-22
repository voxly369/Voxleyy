import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BadgeShelf } from './BadgeShelf.tsx'

describe('BadgeShelf', () => {
  it('renders pinned badges and see all link', () => {
    render(
      <MemoryRouter>
        <BadgeShelf
          username="writerone"
          pinned={[{ badgeKey: 'poet', iconKey: 'quill', name: 'Poet', position: 1 }]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('badge-shelf')).toBeInTheDocument()
    expect(screen.getByText('Poet')).toBeInTheDocument()
    expect(screen.getByTestId('badge-shelf-see-all')).toHaveAttribute('href', '/u/writerone/badges')
  })
})
