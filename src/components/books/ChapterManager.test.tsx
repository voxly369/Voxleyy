import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ChapterManager } from './ChapterManager.tsx'
import type { ChapterDetail } from '../../lib/books/chapterContentSchema.ts'

const sample: ChapterDetail[] = [
  {
    id: 'ch-1',
    bookId: 'book-1',
    position: 1,
    title: 'Opening',
    bodyText: 'Hello world',
    bodyJson: null,
    status: 'draft',
    isSample: false,
    wordCount: 2,
    publishedAt: null,
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

describe('ChapterManager', () => {
  it('lists chapters and calls add', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <MemoryRouter>
        <ChapterManager
          bookId="book-1"
          chapters={sample}
          onCreate={onCreate}
          onDelete={vi.fn()}
          onReorder={vi.fn()}
          onToggleSample={vi.fn()}
          onTogglePublish={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Opening')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add chapter' }))
    expect(onCreate).toHaveBeenCalled()
  })
})
