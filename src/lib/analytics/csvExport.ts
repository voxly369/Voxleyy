export function neutralizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  if (raw.length === 0) return ''
  const first = raw[0]
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t') {
    return `'${raw}`
  }
  return raw
}

export function escapeCsvField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function buildCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map((h) => escapeCsvField(h)).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(neutralizeCsvCell(row[h]))).join(','))
  }
  return `\uFEFF${lines.join('\r\n')}`
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function flattenJsonRows(section: string, payload: unknown): Record<string, unknown>[] {
  if (payload === null || payload === undefined) return []
  if (Array.isArray(payload)) {
    return payload.flatMap((item, index) => flattenJsonRows(`${section}_${index}`, item))
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    const keys = Object.keys(obj)
    const hasNestedObjects = keys.some((k) => typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]))
    if (!hasNestedObjects) return [obj]
    const rows: Record<string, unknown>[] = []
    for (const key of keys) {
      const val = obj[key]
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object') rows.push(item as Record<string, unknown>)
        }
      } else if (val && typeof val === 'object') {
        rows.push(val as Record<string, unknown>)
      } else {
        rows.push({ [key]: val })
      }
    }
    return rows.length ? rows : [obj]
  }
  return [{ value: payload }]
}
