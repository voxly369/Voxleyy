import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationSettingsForm } from './NotificationSettingsForm.tsx'

vi.mock('../../lib/notifications/api.ts', () => ({
  fetchNotificationSettings: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      userId: 'u',
      notifyLikes: true,
      notifyComments: true,
      notifyFollows: true,
      notifyMentions: true,
      notifyMessages: true,
      notifySales: true,
      notifyChapters: true,
      notifyAnnouncements: true,
      quietEnabled: false,
      quietManual: false,
      quietScheduleStart: null,
      quietScheduleEnd: null,
      quietReach: 'everyone',
      timezone: 'UTC',
      showLocalTime: false,
      digestEnabled: false,
      digestTime: null,
      updatedAt: '2026-01-01T00:00:00Z',
    },
  }),
  updateNotificationSettings: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}))

describe('NotificationSettingsForm', () => {
  it('renders activity toggles', async () => {
    render(<NotificationSettingsForm />)
    expect(await screen.findByLabelText(/Likes/i)).toBeInTheDocument()
    expect(screen.getByTestId('notification-settings-form')).toBeInTheDocument()
  })

  it('shows Pen Pals launch note when pen pals reach is selected', async () => {
    const { fetchNotificationSettings } = await import('../../lib/notifications/api.ts')
    vi.mocked(fetchNotificationSettings).mockResolvedValueOnce({
      ok: true,
      data: {
        userId: 'u',
        notifyLikes: true,
        notifyComments: true,
        notifyFollows: true,
        notifyMentions: true,
        notifyMessages: true,
        notifySales: true,
        notifyChapters: true,
        notifyAnnouncements: true,
        quietEnabled: false,
        quietManual: false,
        quietScheduleStart: null,
        quietScheduleEnd: null,
        quietReach: 'pen_pals',
        timezone: 'UTC',
        showLocalTime: false,
        digestEnabled: false,
        digestTime: null,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    })
    render(<NotificationSettingsForm />)
    expect(await screen.findByTestId('quiet-reach-pen-pals-note')).toHaveTextContent('Available when Pen Pals launch')
  })
})
