/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENTRANCE_FADE_OUT_MS } from './entranceMusic.ts'
import { useEntranceMusic } from './useEntranceMusic.ts'

const play = vi.fn<[], Promise<void>>().mockResolvedValue(undefined)
const pause = vi.fn()

vi.mock('./entranceMusicConfig.ts', () => ({
  resolveEntranceMusic: () => ({
    src: '/audio/entrance-loop.mp3',
    credit: 'Test — Artist',
    licence: 'Test licence',
  }),
}))

describe('useEntranceMusic welcome track', () => {
  beforeEach(() => {
    play.mockClear()
    pause.mockClear()
    localStorage.setItem('voxly-entrance-music-v1', JSON.stringify({ enabled: true, muted: false }))
    vi.stubGlobal(
      'Audio',
      vi.fn(function MockAudio(this: { loop: boolean; preload: string; volume: number; currentTime: number; src: string }) {
        this.loop = false
        this.preload = 'none'
        this.volume = 0
        this.currentTime = 0
        this.src = ''
        this.play = play
        this.pause = pause
        return this
      }),
    )
    let clock = 0
    vi.stubGlobal('performance', { now: () => clock })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      clock += ENTRANCE_FADE_OUT_MS / 4
      cb(clock)
      return clock
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts music on open and fades out when the welcome ends', async () => {
    const { result, rerender } = renderHook(
      (props: { entranceOpen: boolean }) =>
        useEntranceMusic({
          entranceOpen: props.entranceOpen,
          reducedMotion: false,
          entranceScreenEnabled: true,
        }),
      { initialProps: { entranceOpen: false } },
    )

    rerender({ entranceOpen: true })

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.fadeOutAndStop()
    })

    await waitFor(() => expect(pause).toHaveBeenCalledTimes(1))
    expect(result.current.musicState).toBe('idle')
  })
})
