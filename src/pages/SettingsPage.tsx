import { useEffect, useState } from 'react'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { SafetySettingsSection } from '../components/safety/SafetySettingsSection.tsx'
import { DeleteAccountModal } from '../components/settings/DeleteAccountModal.tsx'
import { TwoFactorAuthSection } from '../components/settings/TwoFactorAuthSection.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { USERNAME_TAKEN_NOTICE } from '../lib/auth/messages.ts'
import { ThemeChoiceGroup } from '../components/shell/ThemeChoiceGroup.tsx'
import { useTheme } from '../lib/useTheme.ts'
import { downloadJsonExport, exportMyData } from '../lib/account/dataExport.ts'
import { useFeedback } from '../lib/shell/FeedbackProvider.tsx'
import { fetchMyProfilePreferences, patchMyProfilePreferences, reopenOnboarding } from '../lib/onboarding/api.ts'

const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

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

export default function SettingsPage() {
  const { choice, setTheme } = useTheme()
  const { user, profile, signOut, isFounder } = useAuth()
  const { openFeedback } = useFeedback()
  const isWriter = profile?.role === 'writer'
  const chosen = chosenUsername(user?.user_metadata)
  const assigned = profile?.username.toLowerCase() ?? ''
  const showUsernameNotice = Boolean(user && chosen && assigned && chosen !== assigned && !noticeDismissed(user.id))
  const [noticeOpen, setNoticeOpen] = useState(showUsernameNotice)
  const [signingOut, setSigningOut] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportError, setExportError] = useState('')
  const [exportNotice, setExportNotice] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showEntranceScreen, setShowEntranceScreen] = useState(true)
  const [entranceBusy, setEntranceBusy] = useState(false)

  useEffect(() => {
    void fetchMyProfilePreferences().then((result) => {
      if (result.ok) setShowEntranceScreen(result.data.show_entrance_screen)
    })
  }, [])

  function closeNotice() {
    if (user) dismissNotice(user.id)
    setNoticeOpen(false)
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
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
      <TwoFactorAuthSection />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Profile</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to="/settings/profile"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Edit profile & photos
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
          <Link
            to="/settings/notifications"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Notifications
          </Link>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-support-section">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Support</h2>
        <p className="mt-2 text-sm text-muted">Send the Founder a note about bugs, ideas, or how Voxly feels in use.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={openFeedback}
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
            data-testid="settings-send-feedback"
          >
            Send feedback
          </button>
          {!isFounder ? (
            <button
              type="button"
              onClick={() => {
                void reopenOnboarding().then((result) => {
                  if (result.ok) window.dispatchEvent(new Event('voxly-reopen-onboarding'))
                })
              }}
              className={`inline-flex min-h-11 items-center rounded-2xl border border-line px-4 text-base font-semibold text-ink ${focusRing}`}
              data-testid="settings-reopen-onboarding"
            >
              Review onboarding
            </button>
          ) : null}
        </div>
      </section>
      <SafetySettingsSection />
      {isWriter ? (
        <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-creator-section">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Creator</h2>
          <Link
            to="/creator"
            className={`mt-4 inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Creator dashboard
          </Link>
        </section>
      ) : null}
      {isFounder ? (
        <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-founder-section">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Founder</h2>
          <Link
            to="/founder"
            className={`mt-4 inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Founder dashboard
          </Link>
        </section>
      ) : null}
      <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-about">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">About</h2>
        <p className="mt-3 text-sm text-muted">
          Version <span data-testid="settings-app-version">{appVersion}</span>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            to="/terms"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Terms
          </Link>
          <Link
            to="/privacy"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Privacy
          </Link>
          <Link
            to="/community-guidelines"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Community guidelines
          </Link>
          <Link
            to="/copyright"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Copyright
          </Link>
          <Link
            to="/contact"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Contact
          </Link>
          <Link
            to="/licences"
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink ${focusRing}`}
          >
            Font licences
          </Link>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-data-section">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Your data</h2>
        <p className="mt-2 text-sm text-muted">Download a JSON copy of your account data, or permanently delete your account.</p>
        {exportError ? (
          <p role="alert" className="mt-2 text-sm text-coral">
            {exportError}
          </p>
        ) : null}
        {exportNotice ? (
          <p role="status" className="mt-2 text-sm text-ink" data-testid="settings-export-truncated-notice">
            {exportNotice}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={exportBusy}
            onClick={() => {
              setExportBusy(true)
              setExportError('')
              setExportNotice('')
              void exportMyData().then((result) => {
                setExportBusy(false)
                if (!result.ok) {
                  setExportError(result.message)
                  return
                }
                const payload = result.payload as Record<string, unknown>
                if (payload.truncated === true) {
                  const notice =
                    typeof payload.notice === 'string'
                      ? payload.notice
                      : 'Your export is too large to return in one file.'
                  setExportNotice(notice)
                }
                downloadJsonExport(`voxly-export-${profile?.username ?? 'account'}.json`, result.payload)
              })
            }}
            className={`inline-flex min-h-11 items-center rounded-2xl bg-raised px-4 text-base font-semibold text-ink disabled:opacity-60 ${focusRing}`}
            data-testid="settings-download-data"
          >
            {exportBusy ? 'Preparing…' : 'Download my data'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={`inline-flex min-h-11 items-center rounded-2xl border border-coral/40 px-4 text-base font-semibold text-coral ${focusRing}`}
            data-testid="settings-delete-account"
          >
            Delete account
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5" data-testid="settings-experience-section">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Experience</h2>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm">
          <span className="text-ink">Show the entrance screen</span>
          <input
            type="checkbox"
            checked={showEntranceScreen}
            disabled={entranceBusy}
            onChange={(event) => {
              const next = event.target.checked
              setShowEntranceScreen(next)
              setEntranceBusy(true)
              void patchMyProfilePreferences({ show_entrance_screen: next }).then((result) => {
                setEntranceBusy(false)
                if (!result.ok) setShowEntranceScreen(!next)
              })
            }}
            className="size-5 accent-coral"
            data-testid="settings-show-entrance"
          />
        </label>
        <p className="mt-2 text-sm text-muted">Once per day when you open Voxly, see your greeting, quote, and word of the day.</p>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 id="theme-label" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Dark or light mode
        </h2>
        <ThemeChoiceGroup choice={choice} onChange={setTheme} labelledBy="theme-label" />
      </section>
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
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
    </PageContainer>
  )
}
