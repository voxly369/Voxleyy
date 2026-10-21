import { describe, expect, it } from 'vitest'
import { addTag, normalizeTagInput } from './tags.ts'

describe('tag normalisation', () => {
  it('lowercases and strips hash marks', () => {
    expect(normalizeTagInput(' #Hello_World ')).toBe('hello_world')
  })

  it('does not append numeric suffixes to normalised tags', () => {
    expect(normalizeTagInput('hope')).toBe('hope')
    expect(normalizeTagInput('hello_world')).toBe('hello_world')
    expect(addTag([], 'my_tag').tags).toEqual(['my_tag'])
  })

  it('ignores duplicates and enforces max', () => {
    let tags: string[] = []
    for (let i = 0; i < 15; i += 1) {
      const next = addTag(tags, `tag_${i}`)
      tags = next.tags
    }
    expect(tags).toHaveLength(15)
    expect(addTag(tags, 'tag_16').error).toMatch(/15 tags/)
  })
})
