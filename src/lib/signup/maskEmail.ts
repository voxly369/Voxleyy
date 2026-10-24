/** Mask for check-email: first letter of local part + domain. */
export function maskEmailForDisplay(email: string): string {
  const trimmed = email.trim()
  const at = trimmed.indexOf('@')
  if (at <= 0) return trimmed
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (!domain) return trimmed
  const first = local.charAt(0) || '?'
  return `${first}***@${domain}`
}
