import { useContext, useEffect, useId, useRef } from 'react'
import { ModalStackContext } from './modalStackContext.ts'
import { focusFirstFocusable, handleModalTabTrap } from './modalFocus.ts'

export type UseModalOptions = {
  open: boolean
  onClose: () => void
  closeOnEscape?: boolean
  returnFocusRef?: React.RefObject<HTMLElement | null>
}

export function useModal({ open, onClose, closeOnEscape = true, returnFocusRef }: UseModalOptions) {
  const stack = useContext(ModalStackContext)
  if (!stack) throw new Error('useModal requires ModalStackProvider')
  const id = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    openerRef.current =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null)

    stack.register({
      id,
      panel: panelRef.current,
      onClose,
      closeOnEscape,
    })

    const frame = window.requestAnimationFrame(() => {
      stack.register({
        id,
        panel: panelRef.current,
        onClose,
        closeOnEscape,
      })
      focusFirstFocusable(panelRef.current)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      stack.unregister(id)
      openerRef.current?.focus()
      openerRef.current = null
    }
  }, [open, id, onClose, closeOnEscape, returnFocusRef, stack])

  useEffect(() => {
    if (!open || !stack) return
    const modalStack = stack
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && closeOnEscape && modalStack.isTop(id)) {
        event.preventDefault()
        onClose()
        return
      }
      if (modalStack.isTop(id)) handleModalTabTrap(event, panelRef.current)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeOnEscape, id, onClose, stack])

  const zIndex = 50 + stack.depth(id)

  return { panelRef, zIndex }
}
