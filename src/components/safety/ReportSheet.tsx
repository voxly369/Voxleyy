import { useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { REPORT_REASON_LABELS, REPORT_REASONS } from '../../lib/safety/reportSchema.ts'
import { submitReport } from '../../lib/safety/reportsApi.ts'
import type { ReportUiTargetType } from '../../lib/safety/types.ts'

const DETAILS_MAX = 500

export type ReportSheetTarget = {
  targetType: ReportUiTargetType
  targetId: string
  reportedUserId?: string
  label: string
}

type ReportSheetProps = {
  open: boolean
  target: ReportSheetTarget | null
  onClose: () => void
}

type SheetPhase = 'form' | 'success' | 'duplicate'

export function ReportSheet({ open, target, onClose }: ReportSheetProps) {
  const titleId = useId()
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>('spam')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<SheetPhase>('form')

  function reset() {
    setReason('spam')
    setDetails('')
    setBusy(false)
    setError(null)
    setPhase('form')
  }

  function handleClose() {
    if (busy) return
    reset()
    onClose()
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!target || busy) return
    setBusy(true)
    setError(null)
    const result = await submitReport({
      targetType: target.targetType,
      targetId: target.targetId,
      reportedUserId: target.reportedUserId,
      reason,
      details,
    })
    setBusy(false)
    if (!result.ok) {
      if (result.error.code === 'duplicate') {
        setPhase('duplicate')
        return
      }
      setError(result.error.message)
      return
    }
    setPhase('success')
  }

  const detailsCount = details.length

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeOnEscape={!busy}
      labelledBy={titleId}
      containerClassName="fixed inset-0 flex items-end justify-center p-4 lg:items-center"
      className="flex max-h-[90dvh] w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
      backdropLabel="Close report"
    >
      <div className="overflow-y-auto p-5">
        {phase === 'success' ? (
          <div data-testid="report-sheet-success">
            <h2 id={titleId} className="font-serif text-2xl text-ink">
              Report submitted
            </h2>
            <p className="mt-3 text-base text-ink" role="status">
              Thanks, the Founder will review this.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className={`mt-5 inline-flex min-h-11 items-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
            >
              Done
            </button>
          </div>
        ) : phase === 'duplicate' ? (
          <div data-testid="report-sheet-duplicate">
            <h2 id={titleId} className="font-serif text-2xl text-ink">
              Already reported
            </h2>
            <p className="mt-3 text-base text-ink" role="status">
              You already reported this.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className={`mt-5 inline-flex min-h-11 items-center rounded-2xl bg-coral px-5 text-base font-semibold text-white ${focusRing}`}
            >
              OK
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} data-testid="report-sheet-form">
            <h2 id={titleId} className="font-serif text-2xl text-ink">
              Report {target?.label ?? 'content'}
            </h2>
            <fieldset className="mt-4 flex flex-col gap-2">
              <legend className="text-sm font-medium text-ink">Reason</legend>
              {REPORT_REASONS.map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${reason === value ? 'border-coral bg-raised/50' : 'border-line'} ${focusRing}`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  <span className="text-base text-ink">{REPORT_REASON_LABELS[value]}</span>
                </label>
              ))}
            </fieldset>
            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Details (optional)</span>
              <textarea
                value={details}
                maxLength={DETAILS_MAX}
                rows={4}
                onChange={(event) => setDetails(event.target.value)}
                className="rounded-2xl border border-line bg-bg px-3 py-2 text-base text-ink"
                aria-describedby="report-details-count"
              />
              <span id="report-details-count" className="text-sm text-muted">
                {detailsCount}/{DETAILS_MAX}
              </span>
            </label>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-coral">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={handleClose}
                className={`min-h-11 rounded-2xl px-4 text-base font-medium text-ink ${focusRing}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !target}
                className={`min-h-11 rounded-2xl bg-coral px-5 text-base font-semibold text-white disabled:opacity-50 ${focusRing}`}
              >
                {busy ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
