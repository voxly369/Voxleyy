import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotificationBell } from './NotificationBell.tsx'

vi.mock('../../lib/notifications/useNotifications.ts', () => ({
  useNotifications: () => ({
    unreadCount: 4,
    panelOpen: false,
    setPanelOpen: vi.fn(),
    registerPanelAnchor: vi.fn(),
  }),
}))

describe('NotificationBell', () => {
  it('shows unread badge and label', () => {
    render(<NotificationBell />)
    expect(screen.getByTestId('notification-badge-rail')).toHaveTextContent('4')
    expect(screen.getByRole('button', { name: /Notifications, 4 unread/i })).toBeInTheDocument()
  })

})
