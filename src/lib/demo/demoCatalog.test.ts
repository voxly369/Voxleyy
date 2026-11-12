import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHOW_DEMO_DATA } from '../../config/productFlags.ts'
import { DEMO_CONTENT_LABEL, getDemoPosts, getDemoWriters } from './demoCatalog.ts'

describe('demoCatalog', () => {
  it('SHOW_DEMO_DATA defaults to false', () => {
    expect(SHOW_DEMO_DATA).toBe(false)
  })

  it('returns no demo writers when the flag is off', () => {
    expect(getDemoWriters()).toEqual([])
  })

  it('returns no demo posts when the flag is off', () => {
    expect(getDemoPosts()).toEqual([])
  })
})

describe('demoCatalog when SHOW_DEMO_DATA is enabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('exposes labelled demo writers and posts when the flag is on', async () => {
    vi.stubEnv('VITE_SHOW_DEMO_DATA', 'true')
    vi.resetModules()
    const flags = await import('../../config/productFlags.ts')
    expect(flags.SHOW_DEMO_DATA).toBe(true)
    const demo = await import('./demoCatalog.ts')
    const writers = demo.getDemoWriters()
    const posts = demo.getDemoPosts()
    expect(writers.length).toBeGreaterThanOrEqual(2)
    expect(writers.every((w) => w.isDemo)).toBe(true)
    expect(writers.some((w) => w.username.startsWith('DEMO_WRITER_'))).toBe(true)
    expect(posts.length).toBeGreaterThanOrEqual(2)
    expect(posts.every((p) => p.caption === demo.DEMO_CONTENT_LABEL)).toBe(true)
    expect(posts.some((p) => p.title.includes('[Demo]'))).toBe(true)
  })
})
