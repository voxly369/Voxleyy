export type PresetRange = '7' | '30' | '90' | 'custom'

export type AnalyticsDateRange = {
  from: string
  to: string
  preset: PresetRange
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDay: string, delta: number): string {
  const d = new Date(`${isoDay}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function rangeFromPreset(preset: Exclude<PresetRange, 'custom'>, endDay: string = utcToday()): AnalyticsDateRange {
  const days = preset === '7' ? 6 : preset === '30' ? 29 : 89
  return { from: addDays(endDay, -days), to: endDay, preset }
}

export function validateCustomRange(from: string, to: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return 'Use YYYY-MM-DD dates.'
  }
  if (to < from) return 'End date must be on or after start date.'
  const start = Date.parse(`${from}T00:00:00.000Z`)
  const end = Date.parse(`${to}T00:00:00.000Z`)
  const spanDays = Math.floor((end - start) / 86400000)
  if (spanDays > 400) return 'Choose a range of 400 days or fewer.'
  return null
}

export function parseAnalyticsDateRange(from: string, to: string): AnalyticsDateRange | null {
  const err = validateCustomRange(from, to)
  if (err) return null
  return { from, to, preset: 'custom' }
}
