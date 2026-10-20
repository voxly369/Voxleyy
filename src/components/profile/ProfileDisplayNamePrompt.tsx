import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { dismissDisplayNamePrompt } from '../../lib/profiles/needsDisplayName.ts'

type ProfileDisplayNamePromptProps = {
  userId: string
  onDismiss: () => void
}

export function ProfileDisplayNamePrompt({ userId, onDismiss }: ProfileDisplayNamePromptProps) {
  return (
    <div
      className="mx-5 mt-4 rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3"
      role="status"
      data-testid="display-name-prompt"
    >
      <p className="text-base text-ink">Add a display name so people know who you are.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/settings/profile"
          onClick={() => {
            dismissDisplayNamePrompt(userId)
            onDismiss()
          }}
          className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
        >
          Add your name
        </Link>
        <button
          type="button"
          onClick={() => {
            dismissDisplayNamePrompt(userId)
            onDismiss()
          }}
          className={`inline-flex min-h-11 items-center rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink ${focusRing}`}
        >
          Not now
        </button>
      </div>
    </div>
  )
}
