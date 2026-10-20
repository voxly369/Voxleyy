import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfileDisplayNamePrompt } from './ProfileDisplayNamePrompt.tsx'

describe('ProfileDisplayNamePrompt', () => {
  it('links Add your name to edit profile', () => {
    render(
      <MemoryRouter>
        <ProfileDisplayNamePrompt userId="user-1" onDismiss={() => {}} />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Add your name' })
    expect(link).toHaveAttribute('href', '/settings/profile')
  })
})
