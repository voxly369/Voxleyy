import type { NotificationRow } from './types.ts'

export type NotificationGroupKey = 'today' | 'this_week' | 'earlier'

export type NotificationGroup = {
  key: NotificationGroupKey
  label: string
  rows: NotificationRow[]
}

function startOfLocalDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate())
}

function startOfLocalWeek(at: Date): Date {
  const day = startOfLocalDay(at)
  const weekday = day.getDay()
  const mondayOffset = (weekday + 6) % 7
  day.setDate(day.getDate() - mondayOffset)
  return day
}

export function groupNotifications(rows: NotificationRow[], now: Date = new Date()): NotificationGroup[] {
  const todayStart = startOfLocalDay(now).getTime()
  const weekStart = startOfLocalWeek(now).getTime()

  const buckets: Record<NotificationGroupKey, NotificationRow[]> = {
    today: [],
    this_week: [],
    earlier: [],
  }

  for (const row of rows) {
    const created = new Date(row.createdAt).getTime()
    if (Number.isNaN(created)) {
      buckets.earlier.push(row)
      continue
    }
    if (created >= todayStart) {
      buckets.today.push(row)
    } else if (created >= weekStart) {
      buckets.this_week.push(row)
    } else {
      buckets.earlier.push(row)
    }
  }

  const groups: NotificationGroup[] = []
  if (buckets.today.length) groups.push({ key: 'today', label: 'Today', rows: buckets.today })
  if (buckets.this_week.length) groups.push({ key: 'this_week', label: 'This week', rows: buckets.this_week })
  if (buckets.earlier.length) groups.push({ key: 'earlier', label: 'Earlier', rows: buckets.earlier })
  return groups
}
