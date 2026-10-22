import { useEffect, useState } from 'react'
import { focusRing } from '../../components/shell/navItems.ts'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { myAccountRestriction } from '../../lib/safety/accountRestriction.ts'
import { submitAppeal } from '../../lib/safety/appealsApi.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export function AccountStatusPage() {
  const { signOut } = useAuth()
  const [reason, setReason] = useState<string | null>(null)
  const [actionId, setActionId] = useState('')
  const [appealMessage, setAppealMessage] = useState('')
  const [appealError, setAppealError] = useState<string | null>(null)
  const [appealSent, setAppealSent] = useState(false)
  const [pending, setPending] = useState(false)
  useDocumentTitle('Account banned')

  useEffect(() => {
    void (async () => {
      const result = await myAccountRestriction()
      if (result.ok && result.data.statusReason) setReason(result.data.statusReason)
    })()
  }, [])

  async function onAppeal(event: React.FormEvent) {
    event.preventDefault()
    setAppealError(null)
    const result = await submitAppeal(actionId.trim(), appealMessage)
    if (!result.ok) {
      setAppealError(result.error.message)
      return
    }
    setAppealSent(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10" data-testid="account-banned">
      <div className="flex w-full max-w-md flex-col gap-5">
        <p className="font-serif text-4xl text-ink">Voxly</p>
        <h1 className="text-3xl text-ink">Account banned</h1>
        <p role="status" aria-live="polite" className="text-base text-ink">
          Your account is banned. You cannot use Voxly with this account.
        </p>
        {reason ? (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink">{reason}</p>
        ) : null}
        {appealSent ? (
          <p role="status" className="text-sm text-ink">
            Your appeal was submitted. The Founder will review it.
          </p>
        ) : (
          <form
            onSubmit={(e) => void onAppeal(e)}
            data-testid="appeal-form"
            className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <h2 className="text-base font-semibold text-ink">Appeal this decision</h2>
            <label className="flex flex-col gap-1 text-sm">
              Moderation action ID
              <input
                value={actionId}
                onChange={(event) => setActionId(event.target.value)}
                className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Message
              <textarea
                value={appealMessage}
                onChange={(event) => setAppealMessage(event.target.value)}
                maxLength={500}
                rows={3}
                className="rounded-2xl border border-line bg-bg px-3 py-2 text-base"
                required
              />
            </label>
            {appealError ? (
              <p role="alert" className="text-sm text-coral">
                {appealError}
              </p>
            ) : null}
            <button
              type="submit"
              className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
            >
              Submit appeal
            </button>
          </form>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true)
            void signOut()
          }}
          className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-line px-5 text-base font-semibold text-ink disabled:opacity-60 ${focusRing}`}
        >
          {pending ? 'Please wait…' : 'Log out'}
        </button>
      </div>
    </main>
  )
}
