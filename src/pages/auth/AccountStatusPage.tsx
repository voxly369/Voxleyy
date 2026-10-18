import { useState } from 'react'
import { focusRing } from '../../components/shell/navItems.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import type { AccountStatus } from '../../lib/auth/profile.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

function endDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

function explanation(status: AccountStatus, until: string | null): string {
  if (status === 'suspended') {
    const when = endDate(until)
    if (when) return `Your account is suspended until ${when}. You can use Voxly again after that.`
    return 'Your account is suspended. You can use Voxly again when the suspension ends.'
  }
  return 'Your account is banned. You cannot use Voxly with this account.'
}

export function AccountStatusPage() {
  const { profile, signOut } = useAuth()
  const status = profile?.status === 'banned' ? 'banned' : 'suspended'
  const title = status === 'banned' ? 'Account banned' : 'Account suspended'
  const [pending, setPending] = useState(false)
  useDocumentTitle(title)

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="flex w-full max-w-md flex-col gap-5">
        <p className="font-serif text-4xl text-ink">Voxly</p>
        <h1 className="text-3xl text-ink">{title}</h1>
        <p role="status" aria-live="polite" className="text-base text-ink">
          {explanation(status, profile?.suspended_until ?? null)}
        </p>
        <p className="text-sm text-muted">An appeal option arrives in a later step.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true)
            void signOut()
          }}
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-60 ${focusRing}`}
        >
          {pending ? 'Please wait…' : 'Log out'}
        </button>
      </div>
    </main>
  )
}
