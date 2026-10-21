import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContinueReadingRow } from './ContinueReadingRow.tsx'

describe('ContinueReadingRow', () => {
  it('renders continue items', () => {
    render(
      <MemoryRouter>
        <ContinueReadingRow
          items={[
            {
              creationId: 'bb000000-0000-0000-0000-000000000002',
              isAvailable: true,
              type: 'book',
              title: 'Free smoke book',
              caption: null,
              bodyExcerpt: 'First chapter',
              bodyTruncated: false,
              coverUrl: null,
              publishedAt: null,
              author: null,
              percent: 42,
              resumeChapterId: 'cc000000-0000-0000-0000-000000000010',
            },
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('continue-reading-row')).toBeInTheDocument()
    expect(screen.getByText('42% read')).toBeInTheDocument()
  })
})
