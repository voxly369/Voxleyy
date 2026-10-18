import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { EmptyState } from '../states/EmptyState.tsx'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'

export function MissingProfile() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <h1 className="text-4xl text-ink">Profile</h1>
      <EmptyState
        icon={<ImageWithFallback alt="" label="Profile" />}
        title="This profile does not exist"
        message="The link may be wrong, or this account is not available."
        action={
          <Link
            to="/"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
          >
            Home
          </Link>
        }
      />
    </div>
  )
}
