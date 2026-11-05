import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LicencesPage from './LicencesPage.tsx'

vi.mock('../lib/entrance/entranceMusicConfig.ts', () => ({
  resolveEntranceMusic: () => null,
}))

vi.mock('../lib/coverStudio/fonts/fontLicences.ts', () => ({
  coverFontLicenceNotices: () => [],
}))

describe('LicencesPage', () => {
  afterEach(() => cleanup())

  it('renders the welcome track licence entry', () => {
    render(
      <MemoryRouter>
        <LicencesPage />
      </MemoryRouter>,
    )
    const block = screen.getByTestId('licence-welcome-track')
    expect(block).toHaveTextContent(
      'Welcome track: The Sky Is Not the Limit, written by Jaydin and used with permission. Licensed for use in this app.',
    )
  })
})
