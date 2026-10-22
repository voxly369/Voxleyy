import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RemovedContentNotice } from './RemovedContentNotice.tsx'

describe('RemovedContentNotice', () => {
  it('shows Removed by Voxly with reason and Appeal link', () => {
    render(
      <MemoryRouter>
        <RemovedContentNotice reason="Spam policy" kind="creation" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('removed-content-notice')).toBeInTheDocument()
    expect(screen.getByText('Removed by Voxly')).toBeInTheDocument()
    expect(screen.getByText('Spam policy')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Appeal' })).toHaveAttribute('href', '/settings/appeals')
  })
})
