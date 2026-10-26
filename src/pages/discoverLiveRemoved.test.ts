import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(path)
  }
  return out
}

describe('Discover Live tab removed from source', () => {
  it('has no Discover Live tab or route', () => {
    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const text = readFileSync(file, 'utf8')
      if (file.endsWith('discoverLiveRemoved.test.ts')) continue
      if (/\bid:\s*['"]live['"]/.test(text) && file.includes('DiscoverPage')) {
        offenders.push(`${file}: discover live tab id`)
      }
      if (/\{ id: 'live', label: 'Live' \}/.test(text)) {
        offenders.push(`${file}: live tab definition`)
      }
      if (/\/discover\/live/.test(text)) {
        offenders.push(`${file}: /discover/live route`)
      }
    }
    expect(offenders).toEqual([])
  })
})
