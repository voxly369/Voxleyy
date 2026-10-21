import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HighlightEditPanel } from './HighlightEditPanel.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

const highlight = {
  id: '11111111-1111-1111-1111-111111111111',
  creationId: '00000000-0000-0000-0000-000000000001',
  startParagraph: 0,
  startChar: 0,
  endParagraph: 0,
  endChar: 4,
  quote: 'word',
  colour: 'yellow' as const,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('HighlightEditPanel', () => {
  it('saves colour and note changes', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(
      <ModalStackProvider>
        <HighlightEditPanel open highlight={highlight} onClose={() => {}} onSave={onSave} onDelete={() => {}} />
      </ModalStackProvider>,
    )
    await user.click(screen.getByRole('radio', { name: 'green' }))
    await user.type(screen.getByLabelText('Note'), 'My note')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({ colour: 'green', note: 'My note' })
  })
})
