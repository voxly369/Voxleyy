import { createContext } from 'react'

export type CreateSheetContextValue = {
  openCreateSheet: (returnFocus?: HTMLElement | null) => void
  closeCreateSheet: () => void
}

export const CreateSheetContext = createContext<CreateSheetContextValue | null>(null)
