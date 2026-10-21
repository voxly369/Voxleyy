const WORDS_PER_MINUTE = 200

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

export function estimatedMinutesRemaining(totalWords: number, percentComplete: number): number {
  if (totalWords <= 0) return 0
  const remainingWords = totalWords * (1 - Math.min(100, Math.max(0, percentComplete)) / 100)
  return Math.max(0, Math.ceil(remainingWords / WORDS_PER_MINUTE))
}

export function formatMinutesLeft(minutes: number): string {
  if (minutes <= 0) return 'Less than a minute left'
  if (minutes === 1) return '1 minute left'
  return `${minutes} minutes left`
}
