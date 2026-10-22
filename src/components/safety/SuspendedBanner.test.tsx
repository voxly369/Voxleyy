import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SuspendedBanner } from './SuspendedBanner.tsx'

describe('SuspendedBanner', () => {
  it('shows suspension message with end date', () => {
    render(<SuspendedBanner suspendedUntil="2030-06-01T12:00:00.000Z" />)
    expect(screen.getByTestId('suspended-banner')).toHaveTextContent(/suspended until/i)
  })
})
