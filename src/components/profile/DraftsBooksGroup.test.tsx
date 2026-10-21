import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DraftsBooksGroup } from './DraftsBooksGroup.tsx'

describe('DraftsBooksGroup', () => {
  it('lists book drafts with builder links', () => {
    render(
      <MemoryRouter>
        <DraftsBooksGroup
          onDelete={vi.fn()}
          rows={[
            {
              id: 'bb000000-0000-0000-0000-000000000099',
              type: 'book',
              title: 'My novel',
              status: 'draft',
              audience: 'private',
              removed: false,
            } as never,
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('drafts-books-group')).toBeInTheDocument()
    expect(screen.getByText('My novel')).toBeInTheDocument()
  })
})
