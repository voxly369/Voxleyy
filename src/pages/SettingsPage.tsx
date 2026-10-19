import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { USERNAME_TAKEN_NOTICE } from '../lib/auth/messages.ts'
import { useTheme } from '../lib/useTheme.ts'
import type { ThemeChoice } from '../lib/theme.ts'

const USERNAME_NOTICE_KEY = 'voxly-username-notice'

function chosenUsername(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || !('username' in metadata)) return null
  const value = (metadata as { username?: unknown }).username
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null
}

function noticeDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(USERNAME_NOTICE_KEY) === userId
  } catch {
    return false
  }
}

function dismissNotice(userId: string) {
  try {
    localStorage.setItem(USERNAME_NOTICE_KEY, userId)
  } catch {
    // The notice can still close for this visit.
  }
}

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function SettingsPage() {
  const { choice, setTheme } = useTheme()
  const { user, profile, signOut } = useAuth()
  const chosen = chosenUsername(user?.user_metadata)
  const assigned = profile?.username.toLowerCase() ?? ''
  const showUsernameNotice = Boolean(user && chosen && assigned && chosen !== assigned && !noticeDismissed(user.id))
  const [noticeOpen, setNoticeOpen] = useState(showUsernameNotice)
  const [signingOut, setSigningOut] = useState(false)

  function closeNotice() {
    if (user) dismissNotice(user.id)
    setNoticeOpen(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <PageHeader title="Settings" />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Account</h2>
        <dl className="mt-4 flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="mt-1 text-base text-ink">{user?.email ?? 'Not available'}</dd>
          </div>
          <div>
            <dt className="text-muted">Username</dt>
            <dd className="mt-1 text-base text-ink">{profile?.username ?? 'Not available'}</dd>
          </div>
        </dl>
        {noticeOpen ? (
          <div className="mt-4 rounded-2xl border border-line bg-bg p-4" role="status" aria-live="polite">
            <p className="text-sm text-ink">{USERNAME_TAKEN_NOTICE}</p>
            <button
              type="button"
              onClick={closeNotice}
              className={`mt-3 inline-flex min-h-11 items-center rounded-2xl px-3 text-sm font-medium text-ink ${focusRing}`}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Profile</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to="/settings/profile"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Profile
          </Link>
          <Link
            to="/library"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Library
          </Link>
          <Link
            to="/write/drafts"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Drafts
          </Link>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="theme-label" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Dark or light mode
        </h2>
        <div role="radiogroup" aria-labelledby="theme-label" className="mt-4 grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const selected = choice === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(option.value)}
                className={`min-h-11 rounded-2xl px-2 text-sm ${selected ? 'bg-raised font-semibold text-ink ring-1 ring-line' : 'font-medium text-muted'} ${focusRing}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </section>
      <EmptyState
        icon={<ImageWithFallback alt="" label="Settings" />}
        title="Settings"
        message="The rest of Settings arrives in a later step."
      />
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true)
          void signOut()
        }}
        className={`inline-flex min-h-11 items-center justify-center self-start rounded-2xl border border-line bg-surface px-5 text-base font-semibold text-ink disabled:opacity-60 ${focusRing}`}
      >
        {signingOut ? 'Please wait…' : 'Log out'}
      </button>
    </div>
  )
}
