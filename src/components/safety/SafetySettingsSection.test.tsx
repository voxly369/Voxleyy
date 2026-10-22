import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SafetySettingsSection } from './SafetySettingsSection.tsx'

vi.mock('../../lib/safety/blocksApi.ts', () => ({
  listBlocks: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  unblockUser: vi.fn(),
}))
vi.mock('../../lib/safety/mutesApi.ts', () => ({
  listMutes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  unmuteUser: vi.fn(),
}))
vi.mock('../../lib/safety/hiddenWordsApi.ts', () => ({
  listHiddenWords: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  addHiddenWord: vi.fn(),
  removeHiddenWord: vi.fn(),
}))

describe('SafetySettingsSection', () => {
  it('links to reports and appeals', async () => {
    render(
      <MemoryRouter>
        <SafetySettingsSection />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'My reports' })).toHaveAttribute('href', '/settings/reports')
    expect(screen.getByRole('link', { name: 'Appeals' })).toHaveAttribute('href', '/settings/appeals')
  })
})
