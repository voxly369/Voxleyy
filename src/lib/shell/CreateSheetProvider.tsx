import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreateTypePicker } from '../../components/creations/CreateTypePicker.tsx'
import { focusRing } from '../../components/shell/navItems.ts'
import type { CreationType } from '../creations/creationTypes.ts'
import { CreateSheetContext } from './createSheetContext.ts'

export function CreateSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const navigate = useNavigate()

  const closeCreateSheet = useCallback(() => {
    setOpen(false)
    returnFocusRef.current?.focus()
    returnFocusRef.current = null
  }, [])

  const openCreateSheet = useCallback((returnFocus?: HTMLElement | null) => {
    returnFocusRef.current = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ openCreateSheet, closeCreateSheet }), [openCreateSheet, closeCreateSheet])

  function onPick(type: CreationType) {
    closeCreateSheet()
    navigate(`/create/new/${type}`)
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeCreateSheet()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeCreateSheet])

  return (
    <CreateSheetContext.Provider value={value}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={closeCreateSheet} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id={titleId} className="font-serif text-2xl text-ink">
                What will you share?
              </h2>
              <button type="button" onClick={closeCreateSheet} className={`min-h-11 rounded-xl px-3 text-sm font-medium ${focusRing}`}>
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-5 pt-4">
              <CreateTypePicker onPick={onPick} />
            </div>
          </div>
        </div>
      ) : null}
    </CreateSheetContext.Provider>
  )
}
