import { describe, expect, it, vi, afterEach } from 'vitest'
import { useRef, useState } from 'react'
import { render, screen, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../../components/shell/Modal.tsx'
import { ModalStackProvider } from './modalStack.tsx'
import { VOXLY_APP_ROOT_ID } from './modalStackContext.ts'

function Harness({
  open,
  onClose,
  openerRef,
}: {
  open: boolean
  onClose: () => void
  openerRef?: React.RefObject<HTMLButtonElement>
}) {
  return (
    <>
      <div id={VOXLY_APP_ROOT_ID}>
        <button type="button" ref={openerRef}>
          Open dialog
        </button>
      </div>
      <Modal open={open} onClose={onClose} returnFocusRef={openerRef} labelledBy="dlg-title">
        <h2 id="dlg-title">Dialog</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>
    </>
  )
}

function EscHarness() {
  const openerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <div id={VOXLY_APP_ROOT_ID}>
        <button type="button" ref={openerRef} onClick={() => setOpen(true)}>
          Open dialog
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} returnFocusRef={openerRef} labelledBy="esc-title">
        <h2 id="esc-title">Dialog</h2>
        <button type="button">Inside</button>
      </Modal>
    </>
  )
}

describe('useModal / Modal', () => {
  afterEach(() => {
    cleanup()
    document.body.style.overflow = ''
  })

  it('moves focus to the first focusable element on open', async () => {
    const onClose = vi.fn()
    render(
      <ModalStackProvider>
        <Harness open onClose={onClose} />
      </ModalStackProvider>,
    )
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
    })
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('wraps Tab from last to first inside the dialog', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ModalStackProvider>
        <Harness open onClose={onClose} />
      </ModalStackProvider>,
    )
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
    })
    await user.tab()
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()
  })

  it('wraps Shift+Tab from first to last', async () => {
    const user = userEvent.setup()
    render(
      <ModalStackProvider>
        <Harness open onClose={vi.fn()} />
      </ModalStackProvider>,
    )
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
    })
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
  })

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup()
    render(
      <ModalStackProvider>
        <EscHarness />
      </ModalStackProvider>,
    )
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(opener)
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
    })
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
    })
    expect(opener).toHaveFocus()
  })

  it('marks the app root inert while open', async () => {
    render(
      <ModalStackProvider>
        <Harness open onClose={vi.fn()} />
      </ModalStackProvider>,
    )
    const root = document.getElementById(VOXLY_APP_ROOT_ID)
    expect(root).toHaveAttribute('inert')
    expect(root).toHaveAttribute('aria-hidden', 'true')
  })

  it('releases scroll lock on unmount', async () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(
      <ModalStackProvider>
        <Harness open onClose={vi.fn()} />
      </ModalStackProvider>,
    )
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r))
    })
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
