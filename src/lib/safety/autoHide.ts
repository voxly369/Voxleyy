import {
  AUTO_HIDE_DISTINCT_REPORTERS,
  AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING,
} from '../../config/moderation.ts'

export type CreationReportRow = {
  reporterId: string
  authorId: string
  creationId: string
}

export type AutoHideActionRow = {
  creationId: string
  kind: 'auto_hide'
}

export function distinctCreationReporters(
  reports: readonly CreationReportRow[],
  creationId: string,
  authorId: string,
): number {
  const seen = new Set<string>()
  for (const row of reports) {
    if (row.creationId !== creationId) continue
    if (row.reporterId === authorId) continue
    seen.add(row.reporterId)
  }
  return seen.size
}

export function shouldAutoHideDistinctReports(
  distinctCount: number,
  threshold: number = AUTO_HIDE_DISTINCT_REPORTERS,
): boolean {
  return distinctCount >= threshold
}

export function flaggedPostCount(actions: readonly AutoHideActionRow[]): number {
  const posts = new Set<string>()
  for (const row of actions) {
    if (row.kind !== 'auto_hide') continue
    posts.add(row.creationId)
  }
  return posts.size
}

export function shouldIssueAutoHideFinalWarning(
  flaggedCount: number,
  threshold: number = AUTO_HIDE_FLAGGED_POSTS_FOR_FINAL_WARNING,
): boolean {
  return flaggedCount >= threshold
}
