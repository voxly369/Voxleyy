import { describe, expect, it } from 'vitest'
import { parseMentions } from './mentions.ts'

describe('parseMentions', () => {
  it('returns unique lowercase usernames', () => {
    expect(parseMentions('Hi @Alice and @bob_12 again @alice')).toEqual(['alice', 'bob_12'])
  })

  it('ignores invalid handles', () => {
    expect(parseMentions('@ab @way_too_long_username_that_exceeds_limit')).toEqual([])
  })

  it('does not treat email addresses as mentions', () => {
    expect(parseMentions('a@bcd.com')).toEqual([])
  })

  it('parses mentions next to punctuation', () => {
    expect(parseMentions('hi @bob_1!')).toEqual(['bob_1'])
    expect(parseMentions('(@alice)')).toEqual(['alice'])
  })
})
