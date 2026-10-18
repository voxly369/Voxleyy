import { describe, expect, it } from 'vitest'
import { followCursorFilter, isFollowCursor, nextFollowCursor } from './cursor.ts'
import { validateImageFile } from './imageFile.ts'
import { bioSchema, displayNameSchema } from './schemas.ts'
import { parseWebsite } from './website.ts'

const cursor = {
  createdAt: '2026-10-18T22:37:04.123456+00:00',
  id: '11111111-1111-4111-8111-111111111111',
}

describe('website addresses', () => {
  it('accepts http and https and shows the address without the scheme', () => {
    expect(parseWebsite(' https://Example.com/path ')).toEqual({
      ok: true,
      link: { href: 'https://example.com/path', label: 'example.com/path' },
    })
    expect(parseWebsite('http://example.com/')).toEqual({
      ok: true,
      link: { href: 'http://example.com/', label: 'example.com' },
    })
    expect(parseWebsite('')).toEqual({ ok: true, link: null })
  })

  it('rejects javascript, data, and scheme-less input', () => {
    expect(parseWebsite('javascript:alert(1)').ok).toBe(false)
    expect(parseWebsite('data:text/html,hi').ok).toBe(false)
    expect(parseWebsite('example.com').ok).toBe(false)
    expect(parseWebsite('https://user:pass@example.com').ok).toBe(false)
  })
})

describe('image files', () => {
  it('accepts jpeg, png, and webp up to 5 MB', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 1024 }).ok).toBe(true)
    expect(validateImageFile({ type: 'image/png', size: 5 * 1024 * 1024 }).ok).toBe(true)
    expect(validateImageFile({ type: 'image/webp', size: 20 }).ok).toBe(true)
  })

  it('rejects other types and files over 5 MB', () => {
    expect(validateImageFile({ type: 'image/gif', size: 100 }).ok).toBe(false)
    expect(validateImageFile({ type: 'text/plain', size: 100 }).ok).toBe(false)
    expect(validateImageFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }).ok).toBe(false)
    expect(validateImageFile({ type: 'image/png', size: 0 }).ok).toBe(false)
  })
})

describe('follow cursors', () => {
  it('quotes timestamps and keeps pages of 20', () => {
    expect(followCursorFilter(null, 'follower_id')).toBeNull()
    expect(followCursorFilter(cursor, 'follower_id')).toBe(
      'created_at.lt."2026-10-18T22:37:04.123456+00:00",and(created_at.eq."2026-10-18T22:37:04.123456+00:00",follower_id.lt."11111111-1111-4111-8111-111111111111")',
    )
    expect(isFollowCursor({ createdAt: 'bad"value', id: cursor.id })).toBe(false)

    const rows = Array.from({ length: 21 }, (_, index) => ({
      createdAt: `2026-10-18T00:00:${String(index).padStart(2, '0')}+00:00`,
      id: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
    }))
    const page = nextFollowCursor(rows)
    expect(page.page).toHaveLength(20)
    expect(page.nextCursor).toEqual({ createdAt: rows[19]?.createdAt, id: rows[19]?.id })
    expect(nextFollowCursor(rows.slice(0, 20)).nextCursor).toBeNull()
  })
})

describe('profile text schemas', () => {
  it('requires a display name of 1 to 60 characters', () => {
    expect(displayNameSchema.safeParse('  Ada  ').success).toBe(true)
    expect(displayNameSchema.safeParse('   ').success).toBe(false)
    expect(displayNameSchema.safeParse('a'.repeat(61)).success).toBe(false)
    expect(displayNameSchema.safeParse('a'.repeat(60)).success).toBe(true)
  })

  it('allows an empty bio and rejects more than 500 characters', () => {
    expect(bioSchema.safeParse('').success).toBe(true)
    expect(bioSchema.safeParse('a'.repeat(500)).success).toBe(true)
    expect(bioSchema.safeParse('a'.repeat(501)).success).toBe(false)
  })
})
