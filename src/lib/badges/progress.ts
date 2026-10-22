import type { BadgeProgressRow } from './types.ts'
import { badgeMeta } from './badgeMeta.ts'

export function progressPercent(row: BadgeProgressRow): number {
  if (row.earned || row.goal <= 0) return 100
  return Math.min(100, Math.round((row.current / row.goal) * 100))
}

export function mergeProgressWithMeta(rows: readonly BadgeProgressRow[]) {
  return rows.map((row) => {
    const meta = badgeMeta(row.key)
    return {
      ...row,
      name: meta.name,
      description: meta.description,
      iconKey: meta.iconKey,
      percent: progressPercent(row),
    }
  })
}

export function sortBadgeProgress(rows: ReturnType<typeof mergeProgressWithMeta>) {
  return [...rows].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    if (a.percent !== b.percent) return b.percent - a.percent
    return a.name.localeCompare(b.name)
  })
}
