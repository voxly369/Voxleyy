import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from './HomePage.tsx'
import { feedOfflineMessage } from '../lib/feed/offline.ts'

vi.mock('../lib/feed/listFeed.ts', () => ({
  listFeed: vi.fn(),
}))

vi.mock('../components/shell/RightRail.tsx', () => ({
  RightRail: () => null,
}))

vi.mock('../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      username: 'reader',
      display_name: 'Reader',
      bio: '',
      timezone: 'UTC',
      role: 'writer',
    },
    isFounder: false,
  }),
}))

vi.mock('../lib/onboarding/api.ts', () => ({
  fetchMyProfilePreferences: vi.fn(async () => ({
    ok: true,
    data: { checklist_dismissed_at: '2026-01-01T00:00:00Z' },
  })),
  patchMyProfilePreferences: vi.fn(async () => ({ ok: true, data: {} })),
}))

vi.mock('../lib/home/checklistSignals.ts', () => ({
  fetchChecklistSignals: vi.fn(async () => ({
    hasBio: true,
    postCount: 1,
    followCount: 2,
    librarySaveCount: 1,
    readingProgressCount: 1,
    feedbackSent: true,
  })),
}))

vi.mock('../lib/streaks/api.ts', () => ({
  getUserStreaks: vi.fn(async () => ({ ok: true, data: { writing: { current: 0, longest: 0, lastActiveDay: null }, reading: { current: 0, longest: 0, lastActiveDay: null } } })),
}))

vi.mock('../lib/supabaseClient.ts', () => ({
  supabase: { rpc: vi.fn(async () => ({ data: 'Prompt' })) },
}))

vi.mock('../lib/shell/FeedbackProvider.tsx', () => ({
  FeedbackProvider: ({ children }: { children: React.ReactNode }) => children,
  useFeedback: () => ({ openFeedback: () => {} }),
}))

vi.mock('../components/home/HomeChecklistCard.tsx', () => ({
  HomeChecklistCard: () => null,
}))

vi.mock('../components/home/HomeGreeting.tsx', () => ({
  HomeGreeting: () => null,
}))

import { listFeed } from '../lib/feed/listFeed.ts'

describe('HomePage offline', () => {
  beforeEach(() => {
    vi.mocked(listFeed).mockReset()
  })

  it('shows the offline message and Retry loads the feed after the browser comes back online', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    vi.mocked(listFeed).mockResolvedValue({
      ok: true,
      data: { posts: [], nextCursor: null },
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(feedOfflineMessage())

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    window.dispatchEvent(new Event('online'))

    await waitFor(() => {
      expect(listFeed).toHaveBeenCalled()
    })
  })
})
