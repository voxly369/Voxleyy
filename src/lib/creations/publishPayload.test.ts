import { describe, expect, it } from 'vitest'
import { fieldsForPublish, fieldsForSaveCreation } from './publishPayload.ts'

describe('publish payload building', () => {
  it('save fields omit media_url and only include writing fields', () => {
    const fields = fieldsForSaveCreation({
      title: '  Title  ',
      bodyText: 'Body',
      bodyJson: { version: 1, format: 'plain', text: 'Body' },
    })
    expect(fields).not.toHaveProperty('media_url')
    expect(fields.title).toBe('Title')
    expect(fields.body_text).toBe('Body')
  })

  it('publish fields set status and audience without published_at', () => {
    const fields = fieldsForPublish('unlisted')
    expect(fields).toEqual({ status: 'published', audience: 'unlisted' })
    expect(fields).not.toHaveProperty('published_at')
  })
})
