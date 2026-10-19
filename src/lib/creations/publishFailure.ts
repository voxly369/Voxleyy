import type { CreationFailure } from './types.ts'

export type PublishRowSnapshot = {
  id: string
  authorId: string
  updatedAt: string
  isRemoved: boolean
} | null

export type ViewerAccountSnapshot = {
  status: 'active' | 'suspended' | 'banned'
  suspendedUntil: string | null
}

export function isRestrictedAccount(account: ViewerAccountSnapshot, now = new Date()): boolean {
  if (account.status === 'banned') return true
  if (account.status === 'suspended' && account.suspendedUntil) {
    return new Date(account.suspendedUntil) > now
  }
  if (account.status === 'suspended') return true
  return false
}

export function classifyPublishZeroRowUpdate(input: {
  viewerUserId: string
  row: PublishRowSnapshot
  expectedUpdatedAt: string | null
  account: ViewerAccountSnapshot | null
}): CreationFailure | { ok: false; conflict: true; remoteUpdatedAt: string } {
  const { viewerUserId, row, expectedUpdatedAt, account } = input
  if (!row || row.authorId !== viewerUserId) {
    return { ok: false, error: { code: 'not_found', message: 'This work is not available.' } }
  }
  if (row.isRemoved) {
    return { ok: false, error: { code: 'unavailable', message: "This work was removed and can't be changed." } }
  }
  if (account && isRestrictedAccount(account)) {
    return { ok: false, error: { code: 'forbidden', message: "Your account can't publish right now." } }
  }
  if (expectedUpdatedAt && row.updatedAt !== expectedUpdatedAt) {
    return { ok: false, conflict: true, remoteUpdatedAt: row.updatedAt }
  }
  return { ok: false, error: { code: 'not_found', message: 'This work is not available.' } }
}
