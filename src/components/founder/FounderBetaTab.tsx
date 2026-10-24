import { useId, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { Modal } from '../shell/Modal.tsx'
import { founderCreateInviteCode, founderSetPlatformFlag } from '../../lib/founder/platformFlags.ts'

type FlagDef = { key: string; label: string; description: string }

const BETA_FLAGS: FlagDef[] = [
  {
    key: 'beta_signups_open',
    label: 'Sign-ups open',
    description: 'Allow new account registration during beta.',
  },
  {
    key: 'beta_invite_only',
    label: 'Invite only',
    description: 'Require a valid invite code on sign-up.',
  },
  {
    key: 'beta_waitlist_open',
    label: 'Waitlist open',
    description: 'Show waitlist form when sign-ups are closed.',
  },
]

export function FounderBetaTab() {
  const titleId = useId()
  const [flags, setFlags] = useState<Record<string, boolean>>({
    beta_signups_open: true,
    beta_invite_only: false,
    beta_waitlist_open: false,
  })
  const [pending, setPending] = useState<{ key: string; next: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  async function applyFlag(key: string, next: boolean) {
    setBusy(true)
    setMessage(null)
    const result = await founderSetPlatformFlag(key, next)
    setBusy(false)
    setPending(null)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setFlags((current) => ({ ...current, [key]: next }))
  }

  async function createInvite() {
    setBusy(true)
    setMessage(null)
    const result = await founderCreateInviteCode()
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setInviteCode(result.code)
  }

  return (
    <section className="flex flex-col gap-4" data-testid="founder-beta-tab">
      <h2 className="font-serif text-xl text-ink">Beta controls</h2>
      <p className="text-sm text-muted">
        Toggle platform flags for closed beta. Changes apply immediately for new sessions.
      </p>
      <ul className="flex flex-col gap-3">
        {BETA_FLAGS.map((flag) => (
          <li key={flag.key} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{flag.label}</p>
                <p className="text-sm text-muted">{flag.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={flags[flag.key]}
                disabled={busy}
                data-testid={`founder-beta-flag-${flag.key}`}
                onClick={() => setPending({ key: flag.key, next: !flags[flag.key] })}
                className={`min-h-11 rounded-2xl px-4 text-sm font-semibold ${flags[flag.key] ? 'bg-coral text-white' : 'bg-raised text-ink'} ${focusRing}`}
              >
                {flags[flag.key] ? 'On' : 'Off'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() => void createInvite()}
        className={`min-h-11 self-start rounded-2xl border border-line px-4 font-semibold ${focusRing}`}
        data-testid="founder-beta-create-invite"
      >
        Create invite code
      </button>
      {inviteCode ? (
        <p className="text-sm text-ink" data-testid="founder-beta-invite-code">
          New code: <code className="rounded bg-bg px-2 py-1">{inviteCode}</code>
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-coral">
          {message}
        </p>
      ) : null}

      <Modal
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        closeOnEscape={!busy}
        role="alertdialog"
        labelledBy={titleId}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-lg"
      >
        <h3 id={titleId} className="font-serif text-lg text-ink">
          Confirm flag change
        </h3>
        <p className="mt-2 text-sm text-muted">
          {pending ? `Set ${pending.key} to ${pending.next ? 'on' : 'off'}?` : null}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setPending(null)}
            className={`min-h-11 rounded-2xl border px-4 text-sm font-semibold ${focusRing}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !pending}
            onClick={() => pending && void applyFlag(pending.key, pending.next)}
            className={`min-h-11 rounded-2xl bg-coral px-4 text-sm font-semibold text-white ${focusRing}`}
            data-testid="founder-beta-flag-confirm"
          >
            Confirm
          </button>
        </div>
      </Modal>
    </section>
  )
}
