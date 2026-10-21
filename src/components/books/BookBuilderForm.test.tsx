import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookBuilderForm } from './BookBuilderForm.tsx'
import type { BookRecord } from '../../lib/books/bookSchema.ts'

const book: BookRecord = {
  id: 'book-1',
  authorId: 'author',
  title: 'My book',
  subtitle: null,
  description: 'Desc',
  coverUrl: null,
  status: 'draft',
  audience: 'private',
  saleModel: 'free',
  priceCents: 0,
  currency: 'GBP',
  rentalDays: null,
  isbnInternal: null,
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('BookBuilderForm', () => {
  it('submits valid metadata', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(async () => {})
    render(<BookBuilderForm book={book} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Save details' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My book', saleModel: 'free', priceCents: 0 }),
    )
  })
})
