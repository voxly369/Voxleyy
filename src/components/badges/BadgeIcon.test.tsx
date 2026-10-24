import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BadgeIcon } from './BadgeIcon.tsx'

describe('BadgeIcon founder', () => {
  it('renders founder badge with accessible label', () => {
    render(<BadgeIcon badgeKey="founder" iconKey="founder" />)
    expect(screen.getByRole('img', { name: 'Founder' })).toBeInTheDocument()
  })
})
