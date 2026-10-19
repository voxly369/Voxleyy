import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProfilePostTile } from './ProfilePostTile.tsx'
import type { PublishedWorkSummary } from '../../lib/creations/types.ts'

const work: PublishedWorkSummary = {
  id: 'work-1',
  type: 'essay',
  title: 'Tile',
  bodyText: 'Hello',
  bodyJson: null,
  coverUrl: null,
  likeCount: 0,
  commentCount: 0,
  publishedAt: '2026-01-01T00:00:00Z',
  audience: 'public',
}

function renderTile(saved = false, onToggleSave = vi.fn()) {
  const view = render(
    <MemoryRouter>
      <ProfilePostTile work={work} saved={saved} saveBusy={false} onToggleSave={onToggleSave} />
    </MemoryRouter>,
  )
  const surface = view.getByTestId('profile-tile-press-surface')
  return { onToggleSave, surface }
}

describe('ProfilePostTile long-press save', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('has no interactive element nested inside the post link', () => {
    renderTile()
    const link = screen.getByRole('link', { name: 'Tile' })
    expect(link.querySelector('button')).toBeNull()
  })

  it('long press fires one save and suppresses navigation', () => {
    const { onToggleSave, surface } = renderTile(false)
    const link = screen.getByRole('link', { name: 'Tile' })

    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10, pointerId: 1 })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onToggleSave).toHaveBeenCalledTimes(1)
    expect(onToggleSave).toHaveBeenCalledWith('work-1', false)

    fireEvent.click(link)
    expect(link).toHaveAttribute('href', '/c/work-1')
  })

  it('short tap navigates without saving', () => {
    const { onToggleSave, surface } = renderTile()
    const link = screen.getByRole('link', { name: 'Tile' })

    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(surface, { pointerId: 1 })
    fireEvent.click(link)
    expect(onToggleSave).not.toHaveBeenCalled()
  })

  it('cancels long press when the pointer moves beyond 10px', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { onToggleSave, surface } = renderTile()

    await user.pointer([
      { keys: '[TouchA>]', target: surface, coords: { clientX: 10, clientY: 10 } },
      { coords: { clientX: 30, clientY: 10 } },
      { keys: '[/TouchA]' },
    ])
    await new Promise((resolve) => setTimeout(resolve, 550))
    expect(onToggleSave).not.toHaveBeenCalled()
    vi.useFakeTimers()
  })

  it('toggles saved state via the visible Save button', () => {
    const { onToggleSave } = renderTile(true)
    fireEvent.click(screen.getByRole('button', { name: /remove from library/i }))
    expect(onToggleSave).toHaveBeenCalledWith('work-1', true)
  })
})
