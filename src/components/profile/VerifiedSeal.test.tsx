import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { VerifiedSeal } from './VerifiedSeal.tsx'
import { VERIFIED_SEAL_FILL_DARK, VERIFIED_SEAL_FILL_LIGHT } from '../../lib/design/verifiedSealColors.ts'

describe('VerifiedSeal', () => {
  afterEach(() => cleanup())

  it('uses accessible label and img role', () => {
    render(<VerifiedSeal />)
    expect(screen.getByRole('img', { name: 'Verified account' })).toBeInTheDocument()
  })

  it('renders sm, md, and lg sizes', () => {
    const { unmount } = render(<VerifiedSeal size="sm" />)
    expect(screen.getByRole('img', { name: 'Verified account' })).toHaveStyle({ width: '18px', height: '18px' })
    unmount()
    render(<VerifiedSeal size="md" />)
    expect(screen.getByRole('img', { name: 'Verified account' })).toHaveStyle({ width: '24px', height: '24px' })
    cleanup()
    render(<VerifiedSeal size="lg" />)
    expect(screen.getByRole('img', { name: 'Verified account' })).toHaveStyle({ width: '28px', height: '28px' })
  })

  it('documents coral fill tokens for contrast checks', () => {
    expect(VERIFIED_SEAL_FILL_LIGHT).toBe('#E8442A')
    expect(VERIFIED_SEAL_FILL_DARK).toBe('#FF7A61')
  })
})
