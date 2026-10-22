export const FOUNDER_REASON_MAX = 500

export function validateFounderReason(raw: string): { ok: true; reason: string } | { ok: false; message: string } {
  const reason = raw.trim()
  if (!reason) return { ok: false, message: 'A reason is required.' }
  if (reason.length > FOUNDER_REASON_MAX) {
    return { ok: false, message: `Reason must be at most ${FOUNDER_REASON_MAX} characters.` }
  }
  return { ok: true, reason }
}
