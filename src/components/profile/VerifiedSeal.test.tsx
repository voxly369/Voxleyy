import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { VerifiedSeal } from './VerifiedSeal.tsx'
import { DisplayNameWithMarks } from './DisplayNameWithMarks.tsx'
import { VERIFIED_SEAL_FILL_DARK, VERIFIED_SEAL_FILL_LIGHT } from '../../lib/design/verifiedSealColors.ts'
import { showsVerifiedSeal } from '../../lib/profiles/showsVerifiedSeal.ts'

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

  it('uses #FF5A3C for verified seal fill tokens', () => {
    expect(VERIFIED_SEAL_FILL_LIGHT).toBe('#FF5A3C')
    expect(VERIFIED_SEAL_FILL_DARK).toBe('#FF5A3C')
    render(<VerifiedSeal />)
    const paths = document.querySelectorAll('[data-testid="verified-seal"] path[fill]')
    const fills = [...paths].map((node) => node.getAttribute('fill'))
    expect(fills).toContain('#FF5A3C')
  })

  it('founder shows the seal while a non-founder with verified false does not', () => {
    const { unmount } = render(
      <DisplayNameWithMarks name="Founder" verified={showsVerifiedSeal(false, 'founder')} />,
    )
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument()
    unmount()
    render(<DisplayNameWithMarks name="Reader" verified={showsVerifiedSeal(false, 'reader')} />)
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument()
  })
})
