import { describe, expect, it } from 'vitest'
import { messageForCreationDeleteError, messageForCreationWriteError } from './errors.ts'
import { MAX_BODY_TEXT_OCTETS, MAX_TAGS_PER_CREATION } from './limits.ts'
import { validateCreationFields } from './validation.ts'

describe('creation field limits', () => {
  it('rejects body text over 500000 octets and accepts at the limit', () => {
    const at = 'a'.repeat(MAX_BODY_TEXT_OCTETS)
    expect(validateCreationFields({ body_text: at })).toBeNull()
    expect(validateCreationFields({ body_text: `${at}x` })?.code).toBe('too_long')
  })

  it('rejects more than 15 tags', () => {
    const tags = Array.from({ length: MAX_TAGS_PER_CREATION + 1 }, (_, i) => `tag_${i}`)
    expect(validateCreationFields({ tags })?.code).toBe('too_many_tags')
    expect(validateCreationFields({ tags: tags.slice(0, MAX_TAGS_PER_CREATION) })).toBeNull()
  })

  it('maps database errors to friendly copy', () => {
    expect(messageForCreationWriteError({ message: 'You are creating too fast. Wait a bit and try again.' })).toMatch(
      /Slow down/i,
    )
    expect(messageForCreationWriteError({ message: 'A creation can have at most 15 tags.' })).toMatch(/15 tags/)
    expect(messageForCreationDeleteError({ code: '42501' })).toBe("This can't be deleted right now.")
  })
})
