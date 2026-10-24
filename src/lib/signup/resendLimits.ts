const HOUR_MS = 60 * 60 * 1000
const MAX_RESENDS_PER_HOUR = 5
const STORAGE_KEY = 'voxly:confirm-resend'

type ResendLog = { timestamps: number[] }

function readLog(): ResendLog {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { timestamps: [] }
    const parsed = JSON.parse(raw) as ResendLog
    if (!parsed || !Array.isArray(parsed.timestamps)) return { timestamps: [] }
    return parsed
  } catch {
    return { timestamps: [] }
  }
}

function writeLog(log: ResendLog): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    /* ignore quota */
  }
}

export function canResendConfirmation(now = Date.now()): boolean {
  const recent = readLog().timestamps.filter((t) => now - t < HOUR_MS)
  return recent.length < MAX_RESENDS_PER_HOUR
}

export function recordResendConfirmation(now = Date.now()): void {
  const recent = readLog().timestamps.filter((t) => now - t < HOUR_MS)
  writeLog({ timestamps: [...recent, now] })
}

export function resendsRemainingThisHour(now = Date.now()): number {
  const recent = readLog().timestamps.filter((t) => now - t < HOUR_MS)
  return Math.max(0, MAX_RESENDS_PER_HOUR - recent.length)
}
