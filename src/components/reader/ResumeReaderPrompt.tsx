import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'

type ResumeReaderPromptProps = {
  creationId: string
  percent: number
}

export function ResumeReaderPrompt({ creationId, percent }: ResumeReaderPromptProps) {
  return (
    <div className="rounded-2xl border border-line bg-raised px-4 py-3" role="status">
      <p className="text-sm text-ink">Resume where you left off ({percent}% read)</p>
      <Link
        to={`/read/${creationId}`}
        className={`mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-coral ${focusRing}`}
      >
        Continue reading
      </Link>
    </div>
  )
}
