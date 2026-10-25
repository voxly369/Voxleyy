import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ENTRANCE_FADE_MS,
  ENTRANCE_MUSIC_TARGET_VOLUME,
  nextMusicState,
  shouldAttemptPlayback,
  type EntranceMusicState,
} from './entranceMusic.ts'
import { readEntranceMusicPrefs } from './entranceMusicPrefs.ts'
import { resolveEntranceMusic } from './entranceMusicConfig.ts'

export function useEntranceMusic(input: {
  entranceOpen: boolean
  reducedMotion: boolean
  entranceScreenEnabled: boolean
}) {
  const track = resolveEntranceMusic()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [musicState, setMusicState] = useState<EntranceMusicState>('idle')
  const [prefs, setPrefs] = useState(readEntranceMusicPrefs)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!track?.src) return
    const audio = new Audio(track.src)
    audio.loop = true
    audio.preload = 'none'
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [track?.src])

  const runFade = useCallback((from: 'fading-in' | 'fading-out', onDone?: () => void) => {
    const audio = audioRef.current
    if (!audio) return
    const start = performance.now()
    const startVol = audio.volume
    function frame(now: number) {
      const el = audioRef.current
      if (!el) return
      const elapsed = now - start
      const t = Math.min(1, elapsed / ENTRANCE_FADE_MS)
      if (from === 'fading-in') {
        el.volume = t * ENTRANCE_MUSIC_TARGET_VOLUME
        if (t >= 1) {
          setMusicState('playing')
          onDone?.()
          return
        }
      } else {
        el.volume = startVol * (1 - t)
        if (t >= 1) {
          el.pause()
          el.currentTime = 0
          el.volume = 0
          setMusicState('idle')
          onDone?.()
          return
        }
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(frame)
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const onUserGesture = useCallback(async () => {
    if (!track?.src) return
    const latest = readEntranceMusicPrefs()
    setPrefs(latest)
    if (
      !shouldAttemptPlayback({
        trackConfigured: true,
        prefsEnabled: latest.enabled,
        prefsMuted: latest.muted,
        reducedMotion: input.reducedMotion,
        entranceScreenEnabled: input.entranceScreenEnabled,
      })
    ) {
      return
    }
    setMusicState((prev) => nextMusicState(prev, { type: 'gesture' }).state)
    const audio = audioRef.current
    if (!audio) return
    try {
      await audio.play()
      setMusicState('fading-in')
      runFade('fading-in')
    } catch {
      setMusicState('blocked')
    }
  }, [input.entranceScreenEnabled, input.reducedMotion, runFade, track?.src])

  const fadeOutAndStop = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !track?.src || musicState === 'idle') return
    setMusicState('fading-out')
    runFade('fading-out')
  }, [musicState, runFade, track?.src])

  const toggleMute = useCallback(() => {
    const next = readEntranceMusicPrefs()
    const muted = !next.muted
    const saved = { ...next, muted }
    setPrefs(saved)
    try {
      localStorage.setItem('voxly-entrance-music-v1', JSON.stringify(saved))
    } catch {
      /* ignore */
    }
    const audio = audioRef.current
    if (audio) audio.volume = muted ? 0 : ENTRANCE_MUSIC_TARGET_VOLUME
    setMusicState((prev) => nextMusicState(prev, muted ? { type: 'mute' } : { type: 'unmute' }).state)
  }, [])

  return {
    track,
    musicState,
    prefs,
    setPrefs,
    onUserGesture,
    fadeOutAndStop,
    toggleMute,
  }
}
