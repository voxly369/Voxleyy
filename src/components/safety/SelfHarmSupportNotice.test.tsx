import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelfHarmSupportNotice } from './SelfHarmSupportNotice.tsx'

describe('SelfHarmSupportNotice', () => {
  it('lists SADAG and emergency numbers', () => {
    render(<SelfHarmSupportNotice />)
    expect(screen.getByTestId('self-harm-support-notice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0800 567 567' })).toHaveAttribute('href', 'tel:0800567567')
    expect(screen.getByRole('link', { name: '10111' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '112' })).toBeInTheDocument()
  })
})
