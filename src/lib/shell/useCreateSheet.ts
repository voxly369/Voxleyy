import { useContext } from 'react'
import { CreateSheetContext } from './createSheetContext.ts'

export function useCreateSheet() {
  const ctx = useContext(CreateSheetContext)
  if (!ctx) throw new Error('useCreateSheet must be used within CreateSheetProvider')
  return ctx
}
