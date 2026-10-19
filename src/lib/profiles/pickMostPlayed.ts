import type { PublishedWorkSummary } from '../creations/types.ts'

/**
 * Spec §6: pin the most-played piece on a profile.
 * Play/view metrics are not recorded yet — returns null until the reader step ships.
 */
export function pickMostPlayed(_works: readonly PublishedWorkSummary[]): PublishedWorkSummary | null {
  return null
}
