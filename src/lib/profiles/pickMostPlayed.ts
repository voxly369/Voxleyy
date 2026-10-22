import type { PublishedWorkSummary } from '../creations/types.ts'

/**
 * Spec §6: pin the most-played piece on a profile (by view_count).
 */
export function pickMostPlayed(works: readonly PublishedWorkSummary[]): PublishedWorkSummary | null {
  if (works.length === 0) return null
  let best: PublishedWorkSummary | null = null
  let bestViews = -1
  for (const work of works) {
    const views = work.viewCount ?? 0
    if (views > bestViews) {
      bestViews = views
      best = work
    } else if (views === bestViews && best && work.publishedAt > best.publishedAt) {
      best = work
    }
  }
  return bestViews > 0 ? best : null
}
