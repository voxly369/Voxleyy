import { describe, expect, it } from 'vitest'
import { normalizeLookupWord, parseDictionaryResponse } from './dictionaryWord.ts'

describe('normalizeLookupWord', () => {
  it('trims punctuation and lowercases', () => {
    expect(normalizeLookupWord('  "Hello,"  ')).toBe('hello')
  })

  it('rejects invalid tokens', () => {
    expect(normalizeLookupWord('123')).toBeNull()
    expect(normalizeLookupWord('')).toBeNull()
  })
})

describe('parseDictionaryResponse', () => {
  it('extracts the first definition', () => {
    const entry = parseDictionaryResponse(
      [
        {
          word: 'hello',
          meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A greeting.' }] }],
        },
      ],
      'hello',
    )
    expect(entry?.definition).toBe('A greeting.')
    expect(entry?.partOfSpeech).toBe('noun')
  })

  it('returns null for malformed payloads', () => {
    expect(parseDictionaryResponse({ nope: true }, 'hello')).toBeNull()
  })
})
