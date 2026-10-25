import { describe, expect, it } from 'vitest'
import {
  ENTRANCE_MUSIC_TARGET_VOLUME,
  nextMusicState,
  shouldAttemptPlayback,
} from './entranceMusic.ts'

describe('entranceMusic', () => {
  it('starts blocked then fades in after gesture and play ok', () => {
    let m = nextMusicState('idle', { type: 'gesture' })
    expect(m.state).toBe('fading-in')
    m = nextMusicState(m.state, { type: 'play-blocked' })
    expect(m.state).toBe('blocked')
    m = nextMusicState('blocked', { type: 'gesture' })
    m = nextMusicState(m.state, { type: 'play-ok' })
    m = nextMusicState(m.state, { type: 'tick-fade', elapsedMs: 900 })
    expect(m.state).toBe('playing')
    expect(m.volume).toBeCloseTo(ENTRANCE_MUSIC_TARGET_VOLUME)
  })

  it('mutes and fades out on leave', () => {
    let m = nextMusicState('playing', { type: 'mute' })
    expect(m.volume).toBe(0)
    m = nextMusicState('playing', { type: 'leave-entrance' })
    expect(m.state).toBe('fading-out')
    m = nextMusicState(m.state, { type: 'tick-fade', elapsedMs: 900 })
    expect(m.state).toBe('idle')
  })

  it('shouldAttemptPlayback respects prefs and reduced motion', () => {
    expect(
      shouldAttemptPlayback({
        trackConfigured: true,
        prefsEnabled: true,
        prefsMuted: false,
        reducedMotion: false,
        entranceScreenEnabled: true,
      }),
    ).toBe(true)
    expect(
      shouldAttemptPlayback({
        trackConfigured: true,
        prefsEnabled: true,
        prefsMuted: false,
        reducedMotion: true,
        entranceScreenEnabled: true,
      }),
    ).toBe(false)
    expect(
      shouldAttemptPlayback({
        trackConfigured: false,
        prefsEnabled: true,
        prefsMuted: false,
        reducedMotion: false,
        entranceScreenEnabled: true,
      }),
    ).toBe(false)
  })
})
