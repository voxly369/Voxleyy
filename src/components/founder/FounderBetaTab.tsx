import { useEffect, useId, useState } from 'react'
import { accessibleCoralFill, focusRing } from '../shell/navItems.ts'
import { Modal } from '../shell/Modal.tsx'
import { founderCreateInviteCode, founderSetPlatformFlag } from '../../lib/founder/platformFlags.ts'
import { founderListInviteCodes, founderRevokeInviteCode, type FounderInviteCodeRow } from '../../lib/founder/inviteCodes.ts'
import {
  founderListPendingStorageQueue,
  founderPendingStorageCleanupCount,
} from '../../lib/founder/storageCleanup.ts'
import { buildCsv, downloadCsv } from '../../lib/analytics/csvExport.ts'

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

function joinLinkForCode(code: string): string {
  if (typeof window === 'undefined') return `/join?code=${encodeURIComponent(code)}`
  return `${window.location.origin}/join?code=${encodeURIComponent(code)}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

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
  const [maxUses, setMaxUses] = useState('5')
  const [expiresAt, setExpiresAt] = useState('')
  const [note, setNote] = useState('')
  const [inviteRows, setInviteRows] = useState<FounderInviteCodeRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [pendingFiles, setPendingFiles] = useState(0)

  async function refreshInvites() {
    setListLoading(true)
    const result = await founderListInviteCodes()
    setListLoading(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setInviteRows(result.rows)
  }

  useEffect(() => {
    void refreshInvites()
    void founderPendingStorageCleanupCount().then(setPendingFiles)
  }, [])

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
    const result = await founderCreateInviteCode({
      maxUses,
      expiresAt: expiresAt || undefined,
      note: note || undefined,
    })
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setInviteCode(result.code)
    await refreshInvites()
  }

  async function revokeInvite(code: string) {
    setBusy(true)
    setMessage(null)
    const result = await founderRevokeInviteCode(code)
    setBusy(false)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await refreshInvites()
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
              <div className="min-w-0 flex-1">
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
                className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold ${flags[flag.key] ? accessibleCoralFill : 'bg-raised text-ink'} ${focusRing}`}
              >
                {flags[flag.key] ? 'On' : 'Off'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div
        className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
        data-testid="founder-beta-create-invite-form"
      >
        <h3 className="font-medium text-ink">New invite code</h3>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Maximum uses</span>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            className="min-h-11 rounded-xl border border-line bg-bg px-3"
            data-testid="founder-beta-invite-max-uses"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Expiry date (optional)</span>
          <input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="min-h-11 rounded-xl border border-line bg-bg px-3"
            data-testid="founder-beta-invite-expires"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Label (optional)</span>
          <input
            type="text"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-11 rounded-xl border border-line bg-bg px-3"
            data-testid="founder-beta-invite-note"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createInvite()}
          className={`min-h-11 self-start rounded-2xl border border-line px-4 font-semibold ${focusRing}`}
          data-testid="founder-beta-create-invite"
        >
          Create invite code
        </button>
      </div>
      {inviteCode ? (
        <div className="flex flex-col gap-2 text-sm text-ink" data-testid="founder-beta-invite-code">
          <p>
            New code: <code className="rounded bg-bg px-2 py-1">{inviteCode}</code>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`min-h-11 rounded-xl border border-line px-3 text-sm font-semibold ${focusRing}`}
              data-testid="founder-beta-copy-code"
              onClick={() => {
                void copyText(inviteCode).then((ok) => {
                  setMessage(ok ? 'Code copied.' : 'Could not copy code.')
                })
              }}
            >
              Copy code
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-xl border border-line px-3 text-sm font-semibold ${focusRing}`}
              data-testid="founder-beta-copy-join-link"
              onClick={() => {
                const link = joinLinkForCode(inviteCode)
                void copyText(link).then((ok) => {
                  setMessage(ok ? 'Join link copied.' : 'Could not copy link.')
                })
              }}
            >
              Copy join link
            </button>
          </div>
        </div>
      ) : null}
      <div className="rounded-2xl border border-line bg-surface p-4" data-testid="founder-beta-invite-list">
        <h3 className="font-medium text-ink">Invite codes</h3>
        {listLoading ? (
          <p className="mt-2 text-sm text-muted">Loading codes…</p>
        ) : inviteRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No invite codes yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {inviteRows.map((row) => {
              const usesLeft = Math.max(0, row.max_uses - row.uses)
              return (
                <li
                  key={row.code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-sm"
                  data-testid="founder-beta-invite-row"
                >
                  <div className="min-w-0 flex-1">
                    <code>{row.code}</code>
                    {row.note ? <span className="ms-2 text-muted">({row.note})</span> : null}
                  </div>
                  <span className="text-muted" data-testid="founder-beta-invite-uses-left">
                    {usesLeft} left · {row.uses}/{row.max_uses} used
                    {row.expires_at ? ` · expires ${row.expires_at.slice(0, 10)}` : ''}
                    {row.revoked ? ' · revoked' : ''}
                  </span>
                  {!row.revoked ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void copyText(row.code).then((ok) => {
                            setMessage(ok ? 'Code copied.' : 'Could not copy code.')
                          })
                        }}
                        className={`min-h-9 rounded-xl border border-line px-3 text-xs font-semibold ${focusRing}`}
                        data-testid="founder-beta-row-copy-code"
                      >
                        Copy code
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void copyText(joinLinkForCode(row.code)).then((ok) => {
                            setMessage(ok ? 'Join link copied.' : 'Could not copy link.')
                          })
                        }}
                        className={`min-h-9 rounded-xl border border-line px-3 text-xs font-semibold ${focusRing}`}
                        data-testid="founder-beta-row-copy-join-link"
                      >
                        Copy join link
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revokeInvite(row.code)}
                        className={`min-h-9 rounded-xl border border-line px-3 text-xs font-semibold ${focusRing}`}
                        data-testid="founder-beta-revoke-invite"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4" data-testid="founder-pending-storage-cleanup">
        <h3 className="font-medium text-ink">Pending file cleanups</h3>
        <p className="mt-1 text-sm text-muted">
          {pendingFiles} object{pendingFiles === 1 ? '' : 's'} queued after account deletions. See ops/LAUNCH-CHECKLIST.md.
        </p>
        <button
          type="button"
          className={`mt-3 min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
          data-testid="founder-pending-storage-csv"
          onClick={() => {
            void founderListPendingStorageQueue().then((result) => {
              if (!result.ok) {
                setMessage(result.message)
                return
              }
              const csv = buildCsv(
                ['bucket_id', 'object_path', 'queued_at'],
                result.rows.map((row) => ({
                  bucket_id: row.bucketId,
                  object_path: row.objectPath,
                  queued_at: row.queuedAt,
                })),
              )
              downloadCsv('voxly-pending-storage-cleanups.csv', csv)
            })
          }}
        >
          Download CSV
        </button>
      </div>
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
            className={`min-h-11 rounded-2xl px-4 text-sm font-semibold ${accessibleCoralFill} ${focusRing}`}
            data-testid="founder-beta-flag-confirm"
          >
            Confirm
          </button>
        </div>
      </Modal>
    </section>
  )
}
