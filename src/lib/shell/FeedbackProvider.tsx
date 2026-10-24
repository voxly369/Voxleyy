import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { FeedbackModal } from '../../components/feedback/FeedbackModal.tsx'

type FeedbackContextValue = {
  openFeedback: () => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openFeedback = useCallback(() => setOpen(true), [])
  const value = useMemo(() => ({ openFeedback }), [openFeedback])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider')
  return ctx
}
