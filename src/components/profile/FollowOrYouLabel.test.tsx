import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FollowOrYouLabel } from './FollowOrYouLabel.tsx'

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ profile: { id: 'self-id', username: 'me' } }),
}))

vi.mock('./FollowButton.tsx', () => ({
  FollowButton: () => <button type="button">Follow</button>,
}))

describe('FollowOrYouLabel', () => {
  it('shows You for the signed-in user', () => {
    render(
      <FollowOrYouLabel userId="self-id" username="me" following={false} onFollowingChange={() => {}} />,
    )
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument()
  })

  it('shows Follow for other users', () => {
    render(
      <FollowOrYouLabel userId="other" username="other" following={false} onFollowingChange={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument()
  })
})
