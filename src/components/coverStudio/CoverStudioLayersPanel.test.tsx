import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverStudioLayersPanel } from './CoverStudioLayersPanel.tsx'

const textLayer = {
  id: 'title',
  type: 'text' as const,
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  text: 'Hello cover',
  fontFamily: 'Fraunces',
  fontSize: 48,
  fontWeight: 600,
  fontStyle: 'normal' as const,
  color: '#fff',
  align: 'center' as const,
  lineHeight: 1.1,
  letterSpacing: 0,
  uppercase: false,
  shadow: null,
  outline: null,
  highlight: null,
}

describe('CoverStudioLayersPanel', () => {
  it('selects layer on click', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <CoverStudioLayersPanel
        layers={[textLayer]}
        selectedIds={[]}
        onSelect={onSelect}
        onToggleHidden={() => {}}
        onToggleLocked={() => {}}
        onMove={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Hello cover' }))
    expect(onSelect).toHaveBeenCalledWith('title', false)
  })
})
