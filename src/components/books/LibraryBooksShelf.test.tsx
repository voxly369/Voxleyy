import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LibraryBooksShelf } from './LibraryBooksShelf.tsx'

describe('LibraryBooksShelf', () => {
  it('shows empty copy', () => {
    render(
      <MemoryRouter>
        <LibraryBooksShelf books={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('library-books-empty')).toBeInTheDocument()
  })

  it('renders book cards', () => {
    render(
      <MemoryRouter>
        <LibraryBooksShelf
          books={[
            {
              bookId: 'b1',
              title: 'Night book',
              coverUrl: null,
              authorId: 'a1',
              authorUsername: 'writer',
              authorDisplayName: 'Writer',
              saleModel: 'free',
              percent: 10,
              lastChapterId: null,
              lastReadAt: null,
              readingStatus: 'Reading',
              rentalExpiresAt: null,
              rentalDaysLeft: null,
            },
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Night book')).toBeInTheDocument()
  })
})
