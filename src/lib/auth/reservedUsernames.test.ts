import { describe, expect, it } from 'vitest'
import { RESERVED_USERNAMES, isReservedUsername } from './reservedUsernames.ts'

describe('reserved usernames', () => {
  it('rejects every name on the database list, in any case', () => {
    for (const name of RESERVED_USERNAMES) {
      expect(isReservedUsername(name)).toBe(true)
      expect(isReservedUsername(name.toUpperCase())).toBe(true)
    }
  })

  it('allows a name that only resembles a reserved word', () => {
    expect(isReservedUsername('admin2')).toBe(false)
    expect(isReservedUsername('my_writer')).toBe(false)
    expect(isReservedUsername('voxly_reader')).toBe(false)
    expect(isReservedUsername('')).toBe(false)
  })
})
