import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import { ModalStackContext, VOXLY_APP_ROOT_ID, type ModalRegistration } from './modalStackContext.ts'

let scrollLocked = false
let previousOverflow = ''

function lockBackgroundScroll() {
  if (scrollLocked) return
  scrollLocked = true
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBackgroundScroll() {
  if (!scrollLocked) return
  scrollLocked = false
  document.body.style.overflow = previousOverflow
}

function setAppInert(inert: boolean) {
  const root = document.getElementById(VOXLY_APP_ROOT_ID)
  if (!root) return
  if (inert) {
    root.setAttribute('inert', '')
    root.setAttribute('aria-hidden', 'true')
  } else {
    root.removeAttribute('inert')
    root.removeAttribute('aria-hidden')
  }
}

export function ModalStackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<ModalRegistration[]>([])

  const syncInert = useCallback(() => {
    const hasModal = stackRef.current.length > 0
    setAppInert(hasModal)
    if (hasModal) lockBackgroundScroll()
    else unlockBackgroundScroll()
  }, [])

  const register = useCallback(
    (entry: ModalRegistration) => {
      stackRef.current = [...stackRef.current.filter((e) => e.id !== entry.id), entry]
      syncInert()
    },
    [syncInert],
  )

  const unregister = useCallback(
    (id: string) => {
      stackRef.current = stackRef.current.filter((e) => e.id !== id)
      syncInert()
    },
    [syncInert],
  )

  const isTop = useCallback((id: string) => {
    const stack = stackRef.current
    return stack.length > 0 && stack[stack.length - 1].id === id
  }, [])

  const depth = useCallback((id: string) => {
    const index = stackRef.current.findIndex((e) => e.id === id)
    return index < 0 ? 0 : index
  }, [])

  const value = useMemo(
    () => ({ register, unregister, isTop, depth }),
    [register, unregister, isTop, depth],
  )

  return <ModalStackContext.Provider value={value}>{children}</ModalStackContext.Provider>
}
