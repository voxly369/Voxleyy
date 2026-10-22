import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/shell/PageContainer.tsx'
import { PageHeader } from '../../components/shell/PageHeader.tsx'
import { focusRing } from '../../components/shell/navItems.ts'
import { listMyAppeals, submitAppeal } from '../../lib/safety/appealsApi.ts'
import type { AppealRow } from '../../lib/safety/types.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function AppealsPage() {
  useDocumentTitle('Appeals')
  const [rows, setRows] = useState<AppealRow[]>([])
  const [message, setMessage] = useState('')
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function reload() {
    const result = await listMyAppeals()
    if (result.ok) setRows(result.data)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    const result = await submitAppeal(actionId.trim(), message)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setMessage('')
    setActionId('')
    setSuccess('Appeal submitted.')
    void reload()
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Appeals" />
      <Link to="/settings" className={`text-sm text-coral ${focusRing}`}>
        Back to Settings
      </Link>
      <form onSubmit={(e) => void onSubmit(e)} className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Submit an appeal</h2>
        <p className="mt-1 text-sm text-muted">
          Use the moderation reference from your account or removal notice.
        </p>
        <label className="mt-4 flex flex-col gap-1">
          <span className="text-sm text-ink">Moderation action ID</span>
          <input
            value={actionId}
            onChange={(event) => setActionId(event.target.value)}
            className="min-h-11 rounded-2xl border border-line bg-bg px-3 text-base"
            required
          />
        </label>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-sm text-ink">Message</span>
          <textarea
            value={message}
            maxLength={500}
            rows={4}
            onChange={(event) => setMessage(event.target.value)}
            className="rounded-2xl border border-line bg-bg px-3 py-2 text-base"
            required
          />
        </label>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-coral">
            {error}
          </p>
        ) : null}
        {success ? (
          <p role="status" className="mt-2 text-sm text-ink">
            {success}
          </p>
        ) : null}
        <button type="submit" className={`mt-4 min-h-11 rounded-2xl bg-coral px-5 font-semibold text-white ${focusRing}`}>
          Submit appeal
        </button>
      </form>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-line bg-surface p-4 text-sm">
            <p className="font-medium text-ink">{row.status}</p>
            <p className="text-muted">{row.message}</p>
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}
