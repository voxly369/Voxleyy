import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { accessibleCoralFill, focusRing } from '../shell/navItems.ts'
import { patchMyProfilePreferences } from '../../lib/onboarding/api.ts'

const STORAGE_KEY = 'voxly-welcome-moment-v1'

function deviceDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function dismissDevice() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

type WelcomeMomentProps = {
  serverSeenAt: string | null
  onDismissed: () => void
}

export function WelcomeMoment({ serverSeenAt, onDismissed }: WelcomeMomentProps) {
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (serverSeenAt || deviceDismissed()) return
    setOpen(true)
  }, [serverSeenAt])

  async function dismiss() {
    dismissDevice()
    setOpen(false)
    onDismissed()
    void patchMyProfilePreferences({ welcome_moment_seen_at: new Date().toISOString() })
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={() => void dismiss()} labelledBy={titleId} hideBackdrop={false}>
      <div
        className={`mx-auto w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-xl ${reducedMotion ? '' : 'motion-safe:animate-in'}`}
        data-testid="welcome-moment"
      >
        <p className="font-serif text-4xl tracking-tight text-coral" aria-hidden="true">
          Voxly
        </p>
        <h1 id={titleId} className="mt-4 font-serif text-2xl text-ink">
          A home for poets, storytellers, and readers
        </h1>
        <p className="mt-3 text-base text-muted">
          Voxly is for people who care about words — to publish, discover, and read work that moves you.
        </p>
        <button
          type="button"
          onClick={() => void dismiss()}
          className={`mt-6 min-h-11 rounded-2xl px-6 text-base font-semibold text-white ${accessibleCoralFill} ${focusRing}`}
          data-testid="welcome-moment-dismiss"
        >
          Enter
        </button>
      </div>
    </Modal>
  )
}
