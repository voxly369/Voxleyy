import { describe, expect, it, vi, afterEach } from 'vitest'
import { feedOfflineMessage, isBrowserOnline } from './offline.ts'

describe('feed offline helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the offline copy for the feed', () => {
    expect(feedOfflineMessage()).toMatch(/offline/i)
  })

  it('reads navigator.onLine when available', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(isBrowserOnline()).toBe(false)
    vi.stubGlobal('navigator', { onLine: true })
    expect(isBrowserOnline()).toBe(true)
  })
})
