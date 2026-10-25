/** Entrance-only background music state machine (no autoplay before gesture). */

export type EntranceMusicState =
  | 'idle'
  | 'blocked'
  | 'playing'
  | 'fading-in'
  | 'fading-out'

export const ENTRANCE_MUSIC_TARGET_VOLUME = 0.3
export const ENTRANCE_FADE_MS = 900

export type EntranceMusicMachine = {
  state: EntranceMusicState
  volume: number
}

export function nextMusicState(
  current: EntranceMusicState,
  event:
    | { type: 'gesture' }
    | { type: 'play-ok' }
    | { type: 'play-blocked' }
    | { type: 'mute' }
    | { type: 'unmute' }
    | { type: 'leave-entrance' }
    | { type: 'tick-fade'; elapsedMs: number },
): EntranceMusicMachine {
  switch (event.type) {
    case 'gesture':
      if (current === 'idle') return { state: 'fading-in', volume: 0 }
      if (current === 'blocked') return { state: 'fading-in', volume: 0 }
      return { state: current, volume: volumeForState(current) }
    case 'play-blocked':
      return { state: 'blocked', volume: 0 }
    case 'play-ok':
      return { state: 'fading-in', volume: 0 }
    case 'mute':
      return { state: current === 'playing' || current === 'fading-in' ? 'playing' : current, volume: 0 }
    case 'unmute':
      if (current === 'playing' || current === 'fading-in') {
        return { state: 'playing', volume: ENTRANCE_MUSIC_TARGET_VOLUME }
      }
      return { state: current, volume: volumeForState(current) }
    case 'leave-entrance':
      return { state: 'fading-out', volume: volumeForState(current) }
    case 'tick-fade': {
      if (current === 'fading-in') {
        const t = Math.min(1, event.elapsedMs / ENTRANCE_FADE_MS)
        return { state: t >= 1 ? 'playing' : 'fading-in', volume: t * ENTRANCE_MUSIC_TARGET_VOLUME }
      }
      if (current === 'fading-out') {
        const t = Math.min(1, event.elapsedMs / ENTRANCE_FADE_MS)
        return { state: t >= 1 ? 'idle' : 'fading-out', volume: (1 - t) * ENTRANCE_MUSIC_TARGET_VOLUME }
      }
      return { state: current, volume: volumeForState(current) }
    }
    default:
      return { state: current, volume: volumeForState(current) }
  }
}

function volumeForState(state: EntranceMusicState): number {
  if (state === 'playing') return ENTRANCE_MUSIC_TARGET_VOLUME
  if (state === 'fading-in') return 0
  return 0
}

export function shouldAttemptPlayback(input: {
  trackConfigured: boolean
  prefsEnabled: boolean
  prefsMuted: boolean
  reducedMotion: boolean
  entranceScreenEnabled: boolean
}): boolean {
  if (!input.trackConfigured || !input.entranceScreenEnabled) return false
  if (input.reducedMotion) return false
  if (!input.prefsEnabled || input.prefsMuted) return false
  return true
}
