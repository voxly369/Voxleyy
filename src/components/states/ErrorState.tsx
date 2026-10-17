import { useEffect } from 'react'
import { focusRing } from '../shell/navItems.ts'

type ErrorStateProps = {
  title: string
  message: string
  onRetry: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  useEffect(() => {
    document.title = `${title} · Voxly`
  }, [title])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-5 py-16" role="alert">
      <h1 className="text-4xl text-ink">{title}</h1>
      <p className="text-base text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
      >
        Retry
      </button>
    </div>
  )
}
