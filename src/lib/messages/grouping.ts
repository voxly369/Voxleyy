import type { VisibleMessage } from './types.ts'

export type MessageDayGroup = {
  key: string
  label: string
  messages: VisibleMessage[]
}

function startOfLocalDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate())
}

function dayKey(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

function formatDayLabel(at: Date, now: Date): string {
  const today = startOfLocalDay(now).getTime()
  const target = startOfLocalDay(at).getTime()
  const diffDays = Math.round((today - target) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return at.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: at.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

export function groupMessagesByDay(rows: VisibleMessage[], now: Date = new Date()): MessageDayGroup[] {
  const sorted = [...rows].sort((a, b) => a.deliverAt.localeCompare(b.deliverAt))
  const groups: MessageDayGroup[] = []
  let currentKey: string | null = null
  let bucket: VisibleMessage[] = []

  for (const row of sorted) {
    const at = new Date(row.deliverAt)
    const key = Number.isNaN(at.getTime()) ? 'unknown' : dayKey(at)
    if (key !== currentKey) {
      if (currentKey && bucket.length) {
        const labelAt = new Date(bucket[0]!.deliverAt)
        groups.push({ key: currentKey, label: formatDayLabel(labelAt, now), messages: bucket })
      }
      currentKey = key
      bucket = [row]
    } else {
      bucket.push(row)
    }
  }
  if (currentKey && bucket.length) {
    const labelAt = new Date(bucket[0]!.deliverAt)
    groups.push({ key: currentKey, label: formatDayLabel(labelAt, now), messages: bucket })
  }
  return groups
}
