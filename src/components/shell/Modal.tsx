import type { ReactNode } from 'react'
import { useModal, type UseModalOptions } from '../../lib/shell/useModal.ts'

type ModalProps = UseModalOptions & {
  children: ReactNode
  className?: string
  containerClassName?: string
  backdropClassName?: string
  hideBackdrop?: boolean
  labelledBy?: string
  describedBy?: string
  role?: 'dialog' | 'alertdialog'
  backdropLabel?: string
}

export function Modal({
  open,
  onClose,
  closeOnEscape,
  returnFocusRef,
  children,
  className = '',
  containerClassName = 'fixed inset-0 flex items-end justify-center p-4 sm:items-center',
  backdropClassName = 'absolute inset-0 bg-black/50',
  hideBackdrop = false,
  labelledBy,
  describedBy,
  role = 'dialog',
  backdropLabel = 'Close dialog',
}: ModalProps) {
  const { panelRef, zIndex } = useModal({ open, onClose, closeOnEscape, returnFocusRef })

  if (!open) return null

  return (
    <div className={containerClassName} style={{ zIndex }} role="presentation">
      {hideBackdrop ? null : (
        <button type="button" tabIndex={-1} className={backdropClassName} aria-label={backdropLabel} onClick={onClose} />
      )}
      <div
        ref={panelRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`relative z-10 outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  )
}

