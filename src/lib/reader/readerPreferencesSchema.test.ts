import { describe, expect, it } from 'vitest'
import {
  assertReaderPreferencesSize,
  defaultReaderPreferences,
  readerPreferencesByteSize,
  readerPreferencesSchema,
  READER_PREFERENCES_MAX_BYTES,
} from './readerPreferencesSchema.ts'

describe('readerPreferencesSchema', () => {
  it('accepts defaults and enforces size limit', () => {
    expect(readerPreferencesSchema.safeParse(defaultReaderPreferences).success).toBe(true)
    expect(readerPreferencesByteSize(defaultReaderPreferences)).toBeLessThanOrEqual(READER_PREFERENCES_MAX_BYTES)
    expect(() => assertReaderPreferencesSize(defaultReaderPreferences)).not.toThrow()
  })

  it('rejects invalid theme', () => {
    expect(readerPreferencesSchema.safeParse({ theme: 'neon' }).success).toBe(false)
  })
})
