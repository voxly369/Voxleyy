import { describe, expect, it } from 'vitest'
import { becameWriterAfterPublish } from './roleChange.ts'

describe('role change detection', () => {
  it('detects reader to writer promotion', () => {
    expect(becameWriterAfterPublish('reader', 'writer')).toBe(true)
    expect(becameWriterAfterPublish('writer', 'writer')).toBe(false)
    expect(becameWriterAfterPublish('reader', 'founder')).toBe(false)
  })
})
