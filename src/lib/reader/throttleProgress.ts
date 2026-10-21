export const PROGRESS_SAVE_INTERVAL_MS = 5000

export function shouldSaveProgress(lastSavedAtMs: number | null, nowMs: number): boolean {
  if (lastSavedAtMs === null) return true
  return nowMs - lastSavedAtMs >= PROGRESS_SAVE_INTERVAL_MS
}
