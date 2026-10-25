import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')
const BANNED = ['8B5CF6', '8b5cf6', 'text-verified', 'bg-verified']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(tsx?|css|js|json)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) out.push(path)
  }
  return out
}

describe('verified purple token ban', () => {
  it('has no legacy purple verified tokens in source', () => {
    const hits: string[] = []
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, 'utf8')
      for (const token of BANNED) {
        if (text.includes(token)) hits.push(`${file}: ${token}`)
      }
    }
    expect(hits).toEqual([])
  })
})
