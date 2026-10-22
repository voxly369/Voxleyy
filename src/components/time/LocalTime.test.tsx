import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { LocalTime } from './LocalTime.tsx'

describe('LocalTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders formatted time without raw IANA in visible text', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T18:30:00Z'))
    render(<LocalTime timezone="America/New_York" />)
    expect(screen.getByTestId('profile-local-time')).toBeInTheDocument()
    expect(screen.getByTestId('profile-local-time').textContent).not.toContain('America/New_York')
  })
})
