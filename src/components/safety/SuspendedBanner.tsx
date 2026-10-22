import { suspensionEndDate } from '../../lib/safety/moderationDisplay.ts'

type SuspendedBannerProps = {
  suspendedUntil: string | null
}

export function SuspendedBanner({ suspendedUntil }: SuspendedBannerProps) {
  const when = suspensionEndDate(suspendedUntil)
  return (
    <div
      data-testid="suspended-banner"
      role="status"
      className="border-b border-coral/30 bg-coral/10 px-5 py-3 text-sm text-ink"
    >
      {when
        ? `Your account is suspended until ${when}. You can browse Voxly but some actions are limited.`
        : 'Your account is suspended. You can browse Voxly but some actions are limited.'}
    </div>
  )
}
