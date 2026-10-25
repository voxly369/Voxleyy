import { useLocation } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { useFeedback } from '../../lib/shell/FeedbackProvider.tsx'
import { useCreateSheet } from '../../lib/shell/useCreateSheet.ts'

export function FeedbackFab() {
  const { openFeedback } = useFeedback()
  const { createSheetOpen } = useCreateSheet()
  const location = useLocation()
  const path = location.pathname
  if (
    createSheetOpen ||
    path.startsWith('/messages') ||
    path.startsWith('/create') ||
    path.includes('/builder') ||
    path.includes('/cover')
  ) {
    return null
  }

  return (
    <button
      type="button"
      onClick={openFeedback}
      className={`fixed z-40 min-h-11 min-w-11 rounded-full border border-line bg-surface/95 px-4 text-sm font-semibold text-ink shadow-md backdrop-blur bottom-[calc(var(--nav-h)+5.5rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-[calc(var(--rail-width)+1rem)] ${focusRing}`}
      data-testid="feedback-fab"
      aria-label="Open feedback form"
    >
      Feedback
    </button>
  )
}
