import { describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { ConfirmDialog } from './ConfirmDialog.tsx'

describe('ConfirmDialog', () => {
  it('calls cancel on Escape', () => {
    const onCancel = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(
        <ConfirmDialog
          open
          title="Test"
          message="Message"
          confirmLabel="OK"
          onConfirm={() => {}}
          onCancel={onCancel}
        />,
      )
    })
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onCancel).toHaveBeenCalled()
    root.unmount()
    container.remove()
  })
})
