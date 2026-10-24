const EXPORT_ONCE_PER_DAY = 'You can download your data once per day.'
const EXPORT_GENERIC = 'We could not prepare your export. Try again in a moment.'
const DELETE_SESSION = 'For your security, sign in again before deleting your account.'
const DELETE_FOUNDER = 'The Founder account cannot be deleted.'
const DELETE_GENERIC = 'We could not delete your account. Try again or contact support.'

function normalized(raw: string | undefined | null): string {
  return (raw ?? '').trim().toLowerCase()
}

export function mapExportErrorMessage(raw: string | undefined | null): string {
  const msg = normalized(raw)
  if (!msg) return EXPORT_GENERIC
  if (msg.includes('once per day')) return EXPORT_ONCE_PER_DAY
  if (msg.includes('forbidden')) return EXPORT_GENERIC
  return EXPORT_GENERIC
}

export function mapDeleteAccountErrorMessage(raw: string | undefined | null): string {
  const msg = normalized(raw)
  if (!msg) return DELETE_GENERIC
  if (msg.includes('sign in again')) return DELETE_SESSION
  if (msg.includes('founder account')) return DELETE_FOUNDER
  return DELETE_GENERIC
}
