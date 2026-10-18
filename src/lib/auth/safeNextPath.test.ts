import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safeNextPath.ts'

describe('safeNextPath', () => {
  it('allows a same-origin relative path', () => {
    expect(safeNextPath('/settings')).toBe('/settings')
    expect(safeNextPath('/settings?tab=theme')).toBe('/settings?tab=theme')
    expect(safeNextPath('/profile#top')).toBe('/profile#top')
    expect(safeNextPath('/')).toBe('/')
  })

  it('rejects open redirects', () => {
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('/\\evil.com')).toBeNull()
    expect(safeNextPath('javascript:')).toBeNull()
    expect(safeNextPath('javascript:alert(1)')).toBeNull()
    expect(safeNextPath('http://evil.com')).toBeNull()
    expect(safeNextPath('///evil.com')).toBeNull()
    expect(safeNextPath('/%2F%2Fevil.com')).toBeNull()
    expect(safeNextPath('/%5Cevil.com')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath('settings')).toBeNull()
  })
})