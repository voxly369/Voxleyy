import type { QuietStatus } from './types.ts'

export function parseQuietStatus(value: unknown): QuietStatus | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (row.on !== true) return null
  const label = typeof row.label === 'string' ? row.label : 'later'
  const endsAt = typeof row.ends_at === 'string' ? row.ends_at : null
  return { on: true, endsAt, label }
}

/** User-facing considerate-sending copy from recipient_quiet_status. */
export function quietPromptMessage(status: QuietStatus, displayName: string): string {
  const name = displayName.trim() || 'They'
  if (status.endsAt && status.label && status.label !== 'later') {
    return `${name} is in Quiet mode until ${status.label} their time. Your message will still arrive in their inbox.`
  }
  if (status.label === 'Quiet mode is on') {
    return `${name} has Quiet mode on. Your message will still arrive in their inbox.`
  }
  return `${name} may be resting. Your message will still arrive in their inbox.`
}

export function shouldShowConsiderateModal(status: QuietStatus | null): boolean {
  return status?.on === true
}
