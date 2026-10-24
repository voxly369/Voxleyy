import { focusRing } from '../shell/navItems.ts'

/** Stub until client error inbox RPC lands. */
export function FounderErrorsTab() {
  return (
    <section className="flex flex-col gap-4" data-testid="founder-errors-tab">
      <h2 className="font-serif text-xl text-ink">Client errors</h2>
      <p className="text-sm text-muted">
        Scrubbed browser errors reported via <code className="text-xs">report_client_error</code> will appear here.
      </p>
      <div
        className="rounded-2xl border border-dashed border-line bg-bg p-6 text-center text-sm text-muted"
        data-testid="founder-errors-empty"
      >
        No error inbox wired yet — RPC pending.
      </div>
      <button
        type="button"
        disabled
        className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold opacity-50 ${focusRing}`}
        data-testid="founder-errors-refresh"
      >
        Refresh
      </button>
    </section>
  )
}
