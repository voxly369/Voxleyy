import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreateTypePicker } from '../../components/creations/CreateTypePicker.tsx'
import { Modal } from '../../components/shell/Modal.tsx'
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
  }, [])

  const openCreateSheet = useCallback(
    (returnFocus?: HTMLElement | null) => {
      returnFocusRef.current = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
      setOpen(true)
    },
    [],
  )

  const value = useMemo(() => ({ openCreateSheet, closeCreateSheet }), [openCreateSheet, closeCreateSheet])

  function onPick(type: CreationType) {
    closeCreateSheet()
    navigate(`/create/new/${type}`)
  }

  return (
    <CreateSheetContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={closeCreateSheet}
        returnFocusRef={returnFocusRef}
        labelledBy={titleId}
        containerClassName="fixed inset-0 flex items-end justify-center p-0 md:items-center md:p-4"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-lg md:max-h-[min(90vh,640px)] md:max-w-[480px] md:rounded-2xl"
        backdropLabel="Close create sheet"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-serif text-2xl text-ink">
            What will you share?
          </h2>
          <button type="button" onClick={closeCreateSheet} className={`min-h-11 rounded-xl px-3 text-sm font-medium ${focusRing}`}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-4 pb-8">
          <CreateTypePicker onPick={onPick} />
        </div>
      </Modal>
    </CreateSheetContext.Provider>
  )
}
