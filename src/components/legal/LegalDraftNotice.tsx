export function LegalDraftNotice() {
  return (
    <p
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-ink"
      data-testid="legal-draft-notice"
    >
      Draft, pending legal review. Do not rely on this text for compliance decisions.
    </p>
  )
}
