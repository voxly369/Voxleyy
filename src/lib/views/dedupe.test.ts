import { describe, expect, it } from 'vitest'
import { shouldRecordCreationView, viewDedupeStorageKey } from './dedupe.ts'

describe('view dedupe helper', () => {
  it('records once per session storage key', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }
    const id = '00000000-0000-0000-0000-000000000001'
    expect(viewDedupeStorageKey(id)).toContain(id)
    expect(shouldRecordCreationView(id, storage)).toBe(true)
    expect(shouldRecordCreationView(id, storage)).toBe(false)
  })
})
