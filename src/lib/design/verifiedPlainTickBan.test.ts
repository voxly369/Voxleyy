import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')
const ALLOWLIST = new Set([
  join(ROOT, 'components/auth/PasswordChecklist.tsx'),
  join(ROOT, 'lib/badges/badgeIcons.ts'),
])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) out.push(path)
  }
  return out
}

describe('verified plain tick ban', () => {
  it('has no plain ✓ tick beside verified names in UI source', () => {
    const hits: string[] = []
    for (const file of walk(ROOT)) {
      if (ALLOWLIST.has(file)) continue
      const text = readFileSync(file, 'utf8')
      if (text.includes("' ✓'") || text.includes('" ✓"') || text.includes('` ✓`')) {
        hits.push(file)
      }
    }
    expect(hits).toEqual([])
  })
})
