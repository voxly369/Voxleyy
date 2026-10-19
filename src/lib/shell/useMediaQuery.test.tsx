import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery.ts'

describe('useMediaQuery', () => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  let matches = false

  beforeEach(() => {
    matches = false
    listeners.clear()
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      matches,
      addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
        listeners.add(handler)
      },
      removeEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
        listeners.delete(handler)
      },
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)
  })

  it('reads the initial matchMedia value on mount', () => {
    matches = true
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(true)
  })
})
