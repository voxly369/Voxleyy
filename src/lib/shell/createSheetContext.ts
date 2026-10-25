import { createContext } from 'react'

export type CreateSheetContextValue = {
  openCreateSheet: (returnFocus?: HTMLElement | null) => void
  closeCreateSheet: () => void
  createSheetOpen: boolean
}

export const CreateSheetContext = createContext<CreateSheetContextValue | null>(null)
