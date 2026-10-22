import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/shell/PageContainer.tsx'
import { PageHeader } from '../../components/shell/PageHeader.tsx'
import { focusRing } from '../../components/shell/navItems.ts'
import { listMyReports } from '../../lib/safety/reportsApi.ts'
import { myReportStatusLabel } from '../../lib/safety/moderationDisplay.ts'
import { REPORT_REASON_LABELS } from '../../lib/safety/reportSchema.ts'
import type { OwnReportRow } from '../../lib/safety/types.ts'
import { useDocumentTitle } from '../../lib/useDocumentTitle.ts'

export default function MyReportsPage() {
  useDocumentTitle('My reports')
  const [rows, setRows] = useState<OwnReportRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const result = await listMyReports()
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setRows(result.data)
    })()
  }, [])

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="My reports" />
      <Link to="/settings" className={`text-sm text-coral ${focusRing}`}>
        Back to Settings
      </Link>
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
      {rows.length === 0 && !error ? (
        <p className="text-sm text-muted" data-testid="my-reports-empty">
          You have not submitted any reports yet.
        </p>
      ) : null}
      <ul className="flex flex-col gap-3" data-testid="my-reports-list">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-ink">
              {row.targetType} · {REPORT_REASON_LABELS[row.reason]}
            </p>
            <p className="text-sm text-muted" data-testid={`my-report-status-${row.id}`}>
              {myReportStatusLabel(row.status)}
            </p>
            {row.details ? <p className="mt-2 text-sm text-ink">{row.details}</p> : null}
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}
