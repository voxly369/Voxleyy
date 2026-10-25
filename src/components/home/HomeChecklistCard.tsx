import { Link } from 'react-router-dom'
import { checklistCompletion, checklistDoneCount, type ChecklistKey } from '../../lib/home/checklist.ts'
import type { ChecklistSignals } from '../../lib/home/checklist.ts'
import { focusRing, accessibleCoralFill } from '../shell/navItems.ts'
import { useFeedback } from '../../lib/shell/FeedbackProvider.tsx'

const ITEMS: { key: ChecklistKey; label: string; href?: string; action?: 'feedback' }[] = [
  { key: 'profile_photo', label: 'Add a profile photo', href: '/settings/profile' },
  { key: 'profile_bio', label: 'Add your name and bio', href: '/settings/profile' },
  { key: 'first_post', label: 'Post your first piece', href: '/write/drafts' },
  { key: 'follow_two', label: 'Follow two writers', href: '/discover' },
  { key: 'library_save', label: 'Save something to your Library', href: '/' },
  { key: 'try_reader', label: 'Try the reader', href: '/library?tab=continue' },
  { key: 'send_feedback', label: 'Send feedback', action: 'feedback' },
]

type HomeChecklistCardProps = {
  signals: ChecklistSignals
  dismissed: boolean
  onDismiss: () => void
}

export function HomeChecklistCard({ signals, dismissed, onDismiss }: HomeChecklistCardProps) {
  const { openFeedback } = useFeedback()
  const progress = checklistCompletion(signals)
  const done = checklistDoneCount(progress)
  const total = ITEMS.length

  if (dismissed || done >= total) return null

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" data-testid="home-checklist">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl text-ink">Your first steps</h2>
          <p className="mt-1 text-sm text-muted">
            {done} of {total} complete — small steps, steady rhythm.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={`min-h-11 text-sm font-medium text-muted ${focusRing}`}
          data-testid="home-checklist-dismiss"
        >
          Dismiss
        </button>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {ITEMS.map((item) => {
          const complete = progress[item.key]
          return (
            <li key={item.key} className="flex items-center justify-between gap-2 text-sm">
              <span className={complete ? 'text-muted line-through' : 'text-ink'}>{item.label}</span>
              {complete ? (
                <span className="text-xs font-semibold text-coral">Done</span>
              ) : item.action === 'feedback' ? (
                <button
                  type="button"
                  onClick={openFeedback}
                  className={`min-h-11 min-w-11 rounded-xl px-3 text-xs font-semibold text-white ${accessibleCoralFill} ${focusRing}`}
                >
                  Send
                </button>
              ) : item.href ? (
                <Link to={item.href} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-xs font-semibold text-coral ${focusRing}`}>
                  Go
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
