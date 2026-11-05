/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntranceAnimatedScene } from './EntranceAnimatedScene.tsx'
import {
  WELCOME_SCENE_DURATION_MS,
  WELCOME_SCENE_MAX_MS,
} from '../../lib/entrance/welcomeSceneTiming.ts'

describe('EntranceAnimatedScene', () => {
  beforeEach(() => {
    let now = 0
    const queue: FrameRequestCallback[] = []
    vi.stubGlobal('performance', { now: () => now })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      queue.push(cb)
      return queue.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })

    ;(globalThis as { __flushWelcomeRaf?: (stepMs: number) => void }).__flushWelcomeRaf = (stepMs: number) => {
      now += stepMs
      const pending = queue.splice(0, queue.length)
      pending.forEach((cb) => cb(now))
    }
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('ends within 8 seconds and hands off', () => {
    const onHandoff = vi.fn()
    render(
      <EntranceAnimatedScene
        reducedMotion={false}
        palette="night"
        parallax={0}
        active
        onSequenceHandoff={onHandoff}
      />,
    )

    const flush = (globalThis as { __flushWelcomeRaf?: (stepMs: number) => void }).__flushWelcomeRaf!
    let elapsed = 0
    act(() => {
      while (elapsed < WELCOME_SCENE_MAX_MS + 500 && onHandoff.mock.calls.length === 0) {
        flush(350)
        elapsed += 350
      }
    })

    expect(onHandoff).toHaveBeenCalledTimes(1)
    expect(elapsed).toBeGreaterThanOrEqual(WELCOME_SCENE_DURATION_MS - 350)
    expect(elapsed).toBeLessThanOrEqual(WELCOME_SCENE_MAX_MS + 350)
  })

  it('renders the still scene when prefers-reduced-motion is on', () => {
    render(<EntranceAnimatedScene reducedMotion={true} palette="night" parallax={0} active={false} />)
    expect(screen.getByTestId('entrance-scene-still')).toBeInTheDocument()
    expect(screen.queryByTestId('entrance-scene')).not.toBeInTheDocument()
  })
})
