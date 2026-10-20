import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MoreMenu } from './MoreMenu.tsx'

const signOut = vi.fn(async () => {})

vi.mock('../../lib/auth/auth-context.ts', () => ({
  useAuth: () => ({ signOut }),
}))

vi.mock('../../lib/useTheme.ts', () => ({
  useTheme: () => ({ choice: 'system', setTheme: vi.fn() }),
}))

describe('MoreMenu', () => {
  beforeEach(() => {
    signOut.mockClear()
  })

  it('closes on Escape and returns focus to More', async () => {
    render(
      <MemoryRouter>
        <MoreMenu username="readerone" />
      </MemoryRouter>,
    )
    const trigger = screen.getAllByTestId('more-menu-trigger')[0]
    fireEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeVisible()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    return waitFor(() => expect(trigger).toHaveFocus())
  })

  it('closes on outside click and returns focus to More', async () => {
    render(
      <MemoryRouter>
        <div>
          <button type="button">Outside</button>
          <MoreMenu username="readerone" />
        </div>
      </MemoryRouter>,
    )
    const trigger = screen.getAllByTestId('more-menu-trigger')[0]
    fireEvent.click(trigger)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('supports arrow key navigation between menu items', () => {
    render(
      <MemoryRouter>
        <MoreMenu username="readerone" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getAllByTestId('more-menu-trigger')[0])
    act(() => {})
    const library = screen.getByRole('menuitem', { name: 'Library' })
    expect(library).toHaveFocus()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(screen.getByRole('menuitem', { name: 'Drafts' })).toHaveFocus()
  })
})
