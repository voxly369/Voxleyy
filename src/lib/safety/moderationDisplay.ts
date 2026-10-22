import type { Database } from '../database.types.ts'

export type AccountStatus = Database['public']['Enums']['account_status']

export function suspensionEndDate(until: string | null | undefined): string | null {
  if (!until) return null
  const date = new Date(until)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

export function statusDisplay(status: AccountStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'suspended':
      return 'Suspended'
    case 'banned':
      return 'Banned'
    default:
      return status
  }
}

export function reportStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'dismissed':
      return 'Dismissed'
    case 'actioned':
      return 'Actioned'
    default:
      return status
  }
}
