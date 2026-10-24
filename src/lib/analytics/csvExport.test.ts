import { describe, expect, it } from 'vitest'
import { buildCsv, neutralizeCsvCell } from './csvExport.ts'

describe('csvExport', () => {
  it('neutralizes formula injection prefixes', () => {
    expect(neutralizeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(neutralizeCsvCell('+cmd')).toBe("'+cmd")
    expect(neutralizeCsvCell('-1+1')).toBe("'-1+1")
    expect(neutralizeCsvCell('@evil')).toBe("'@evil")
  })

  it('buildCsv adds UTF-8 BOM and escapes quotes', () => {
    const csv = buildCsv(['a'], [{ a: 'say "hi"' }])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"say ""hi"""')
  })
})
