import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BookPage from './BookPage.tsx'

vi.mock('../lib/books/booksApi.ts', () => ({
  fetchBookById: vi.fn(),
  fetchBookToc: vi.fn(),
  fetchBookReadingProgress: vi.fn(),
  fetchPaymentsEnabled: vi.fn(),
}))

vi.mock('../lib/books/entitlementsApi.ts', () => ({
  claimFreeBook: vi.fn(),
  userHasBookEntitlement: vi.fn(),
}))

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ profile: null }),
}))

vi.mock('../lib/shell/useToast.ts', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

describe('BookPage states', () => {
  beforeEach(async () => {
    const booksApi = await import('../lib/books/booksApi.ts')
    const entitlements = await import('../lib/books/entitlementsApi.ts')
    vi.mocked(booksApi.fetchPaymentsEnabled).mockResolvedValue(false)
    vi.mocked(booksApi.fetchBookReadingProgress).mockResolvedValue(null)
    vi.mocked(entitlements.userHasBookEntitlement).mockResolvedValue(false)
  })

  it('shows paid unlisted buy notice', async () => {
    const booksApi = await import('../lib/books/booksApi.ts')
    vi.mocked(booksApi.fetchBookById).mockResolvedValue({
      ok: true,
      data: {
        id: 'book-paid',
        authorId: 'author-2',
        title: 'Paid title',
        subtitle: null,
        description: 'About',
        coverUrl: 'https://example.com/cover.jpg',
        status: 'unlisted',
        audience: 'public',
        saleModel: 'purchase',
        priceCents: 499,
        currency: 'GBP',
        rentalDays: null,
        isbnInternal: null,
        updatedAt: '2026-01-01T00:00:00Z',
        author: { id: 'author-2', username: 'writertwo', displayName: 'Writer', avatarUrl: null, verified: false },
      },
    })
    vi.mocked(booksApi.fetchBookToc).mockResolvedValue({ ok: true, data: [] })

    render(
      <MemoryRouter initialEntries={['/books/book-paid']}>
        <Routes>
          <Route path="/books/:id" element={<BookPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Paid title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Buy for/i })).toBeDisabled()
    expect(screen.getByText(/unlisted/i)).toBeInTheDocument()
  })

  it('shows add to library for free books', async () => {
    const booksApi = await import('../lib/books/booksApi.ts')
    vi.mocked(booksApi.fetchBookById).mockResolvedValue({
      ok: true,
      data: {
        id: 'book-free',
        authorId: 'author-2',
        title: 'Free title',
        subtitle: null,
        description: '',
        coverUrl: null,
        status: 'published',
        audience: 'public',
        saleModel: 'free',
        priceCents: 0,
        currency: 'GBP',
        rentalDays: null,
        isbnInternal: null,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    })
    vi.mocked(booksApi.fetchBookToc).mockResolvedValue({ ok: true, data: [] })

    render(
      <MemoryRouter initialEntries={['/books/book-free']}>
        <Routes>
          <Route path="/books/:id" element={<BookPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Add to library' })).toBeEnabled()
  })
})
