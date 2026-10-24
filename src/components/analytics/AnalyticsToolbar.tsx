import { focusRing } from '../shell/navItems.ts'
import type { AnalyticsDateRange, PresetRange } from '../../lib/analytics/dateRange.ts'
import { filterValidationError, normalizeCountryFilter, normalizeRoleFilter } from '../../lib/analytics/filters.ts'

type AnalyticsToolbarProps = {
  range: AnalyticsDateRange
  country: string
  role: string
  onRangeChange: (range: AnalyticsDateRange) => void
  onCountryChange: (value: string) => void
  onRoleChange: (value: string) => void
  onRefresh?: () => void
  refreshBusy?: boolean
  onExport?: () => void
  exportBusy?: boolean
  exportLabel?: string
  filterError?: string | null
}

const PRESETS: { id: PresetRange; label: string }[] = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'custom', label: 'Custom' },
]

export function AnalyticsToolbar({
  range,
  country,
  role,
  onRangeChange,
  onCountryChange,
  onRoleChange,
  onRefresh,
  refreshBusy,
  onExport,
  exportBusy,
  exportLabel = 'Export CSV',
  filterError,
}: AnalyticsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" data-testid="analytics-toolbar">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={range.preset === preset.id}
            onClick={() => {
              if (preset.id === 'custom') {
                onRangeChange({ ...range, preset: 'custom' })
                return
              }
              const end = range.to
              const days = preset.id === '7' ? 6 : preset.id === '30' ? 29 : 89
              const start = new Date(`${end}T12:00:00.000Z`)
              start.setUTCDate(start.getUTCDate() - days)
              onRangeChange({ from: start.toISOString().slice(0, 10), to: end, preset: preset.id })
            }}
            className={`min-h-11 rounded-2xl px-3 text-sm font-semibold ${range.preset === preset.id ? 'bg-surface text-coral ring-2 ring-inset ring-coral' : 'bg-raised text-ink'} ${focusRing}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {range.preset === 'custom' ? (
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">From</span>
            <input
              type="date"
              value={range.from}
              onChange={(e) => onRangeChange({ ...range, from: e.target.value, preset: 'custom' })}
              className="min-h-11 rounded-2xl border border-line bg-bg px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">To</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => onRangeChange({ ...range, to: e.target.value, preset: 'custom' })}
              className="min-h-11 rounded-2xl border border-line bg-bg px-3"
            />
          </label>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Country (optional)</span>
          <input
            value={country}
            onChange={(e) => onCountryChange(e.target.value.toUpperCase())}
            placeholder="ZA"
            maxLength={2}
            className="min-h-11 w-24 rounded-2xl border border-line bg-bg px-3 uppercase"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Role (optional)</span>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="min-h-11 rounded-2xl border border-line bg-bg px-3"
          >
            <option value="">All</option>
            <option value="reader">Reader</option>
            <option value="writer">Writer</option>
          </select>
        </label>
      </div>
      {filterError ? (
        <p role="alert" className="text-sm text-coral">
          {filterError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {onRefresh ? (
          <button
            type="button"
            disabled={refreshBusy}
            onClick={onRefresh}
            className={`min-h-11 rounded-2xl bg-raised px-4 text-sm font-semibold text-ink disabled:opacity-60 ${focusRing}`}
            data-testid="analytics-refresh"
          >
            {refreshBusy ? 'Refreshing…' : 'Refresh now'}
          </button>
        ) : null}
        {onExport ? (
          <button
            type="button"
            disabled={exportBusy}
            onClick={onExport}
            className={`min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold disabled:opacity-60 ${focusRing}`}
            data-testid="analytics-export"
          >
            {exportBusy ? 'Exporting…' : exportLabel}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Metrics refresh lazily when you open this dashboard (missing days and the last two UTC days). A scheduled job
        could call refresh_daily_metrics nightly instead.
      </p>
    </div>
  )
}

export function toolbarFilterParams(country: string, role: string): { country: string | null; role: string | null; error: string | null } {
  const error = filterValidationError(country, role)
  return {
    country: normalizeCountryFilter(country),
    role: normalizeRoleFilter(role),
    error,
  }
}
