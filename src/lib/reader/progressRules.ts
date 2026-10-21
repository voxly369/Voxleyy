export const COMPLETION_PERCENT = 98

export function isReadingCompleted(percent: number): boolean {
  return percent >= COMPLETION_PERCENT
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}
