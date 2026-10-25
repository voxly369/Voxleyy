const STORAGE_KEY = 'voxly-entrance-music-v1'

export type EntranceMusicPrefs = {
  /** User wants entrance music when a track is configured (Settings, default true). */
  enabled: boolean
  /** Muted on this device (entrance speaker toggle). */
  muted: boolean
}

const DEFAULT: EntranceMusicPrefs = { enabled: true, muted: false }

export function readEntranceMusicPrefs(): EntranceMusicPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<EntranceMusicPrefs>
    return {
      enabled: parsed.enabled !== false,
      muted: parsed.muted === true,
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function writeEntranceMusicPrefs(patch: Partial<EntranceMusicPrefs>): EntranceMusicPrefs {
  const next = { ...readEntranceMusicPrefs(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
  return next
}
