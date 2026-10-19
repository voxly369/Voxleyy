import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

describe('hover reveal accessibility', () => {
  it('does not use group-hover without a keyboard focus-within pair', () => {
    const root = path.join(process.cwd(), 'src')
    const offenders: string[] = []
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf8')
      if (text.includes('group-hover:') && !text.includes('group-focus-within:') && !text.includes('group-supports-hover:')) {
        offenders.push(path.relative(root, file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('does not use raw Tailwind hover: utilities in components', () => {
    const root = path.join(process.cwd(), 'src')
    const offenders: string[] = []
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf8')
      if (/\bhover:[a-z]/i.test(text) && !text.includes('supports-hover:')) {
        offenders.push(path.relative(root, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
