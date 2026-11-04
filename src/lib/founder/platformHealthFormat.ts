const JOHANNESBURG = 'Africa/Johannesburg'

export function formatSignupDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: JOHANNESBURG,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatLoginTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-ZA', {
    timeZone: JOHANNESBURG,
    timeStyle: 'short',
  }).format(date)
}
