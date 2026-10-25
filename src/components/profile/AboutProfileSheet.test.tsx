import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AboutProfileSheet } from './AboutProfileSheet.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import type { PublicProfile } from '../../lib/profiles/types.ts'

const base: PublicProfile = {
  id: '1',
  username: 'writer',
  displayName: 'Writer One',
  bio: '',
  avatarUrl: null,
  bannerUrl: null,
  website: null,
  country: null,
  city: null,
  cityVisible: false,
  language: 'en',
  role: 'writer',
  verified: false,
  verifiedAt: null,
  followerCount: 0,
  followingCount: 0,
  creationCount: 0,
  createdAt: '2024-06-01T00:00:00.000Z',
  showLocalTime: false,
  timezone: 'UTC',
}

function renderSheet(profile: PublicProfile) {
  return render(
    <ModalStackProvider>
      <AboutProfileSheet open onClose={() => {}} profile={profile} />
    </ModalStackProvider>,
  )
}

describe('AboutProfileSheet', () => {
  afterEach(() => cleanup())

  it('shows joined date for unverified profiles', () => {
    renderSheet(base)
    expect(screen.getByText(/Date joined/i)).toBeInTheDocument()
    expect(screen.getByText(/June 2024/i)).toBeInTheDocument()
  })

  it('shows verified month when verified', () => {
    renderSheet({
      ...base,
      verified: true,
      verifiedAt: '2025-03-15T00:00:00.000Z',
    })
    expect(screen.getByText(/March 2025/i)).toBeInTheDocument()
    expect(screen.getByText(/not an endorsement by Voxly/i)).toBeInTheDocument()
  })

  it('shows country when set', () => {
    renderSheet({ ...base, country: 'ZA' })
    expect(screen.getByText(/Account based in/i)).toBeInTheDocument()
    expect(screen.getByText(/South Africa/i)).toBeInTheDocument()
  })
})
