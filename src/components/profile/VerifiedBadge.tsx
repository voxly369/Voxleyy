export function VerifiedBadge() {
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center text-verified" role="img" aria-label="Verified">
      <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M6 10.2 8.4 12.6 14 7" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
