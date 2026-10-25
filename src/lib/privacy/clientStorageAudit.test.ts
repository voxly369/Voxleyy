import { describe, expect, it } from 'vitest'
import { CLIENT_STORAGE_INVENTORY } from './clientStorageAudit.ts'

describe('CLIENT_STORAGE_INVENTORY', () => {
  it('lists every documented browser store key', () => {
    const keys = CLIENT_STORAGE_INVENTORY.map((row) => `${row.store}:${row.key}`)
    expect(keys).toContain('localStorage:voxly-theme')
    expect(keys).toContain('localStorage:voxly:confirm-resend')
    expect(keys).toContain('sessionStorage:voxly-activity-touch-v1')
    expect(keys).toContain('IndexedDB:voxly-offline-reading')
  })
})
