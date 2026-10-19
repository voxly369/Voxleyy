import { describe, expect, it, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

describe('ConfirmDialog', () => {
  it('calls cancel on Escape', () => {
    const onCancel = vi.fn()
    render(
      <ModalStackProvider>
        <ConfirmDialog
          open
          title="Test"
          message="Message"
          confirmLabel="OK"
          onConfirm={() => {}}
          onCancel={onCancel}
        />
      </ModalStackProvider>,
    )
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onCancel).toHaveBeenCalled()
  })
})
