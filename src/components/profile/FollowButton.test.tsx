import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FollowButton } from './FollowButton.tsx'

vi.mock('../../lib/profiles/api.ts', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}))

import { followUser, unfollowUser } from '../../lib/profiles/api.ts'

describe('FollowButton', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('clears pending after follow error', async () => {
    let resolveFollow!: (value: Awaited<ReturnType<typeof followUser>>) => void
    vi.mocked(followUser).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFollow = resolve
        }),
    )
    const onChange = vi.fn()
    render(
      <FollowButton userId="u2" username="writer" following={false} onChange={onChange} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Follow' }))
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Please wait…')
    })
    resolveFollow({
      ok: false,
      error: { code: 'forbidden', message: 'Follow is not allowed for this account. (42501)' },
    })
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Follow')
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Follow is not allowed')
  })

  it('clears pending when followUser throws', async () => {
    vi.mocked(followUser).mockRejectedValueOnce(new Error('network'))
    const onChange = vi.fn()
    render(
      <FollowButton userId="u2" username="writer" following={false} onChange={onChange} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Follow' }))
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Follow')
    })
    expect(unfollowUser).not.toHaveBeenCalled()
  })
})
