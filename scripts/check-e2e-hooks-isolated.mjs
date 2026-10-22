#!/usr/bin/env node
/** Ensures src/ never imports e2e mock modules. */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(process.cwd(), 'src')
const forbiddenImport = /from\s+['"][^'"]*e2e\//

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(path))
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path)
  }
  return files
}

const bad = []
for (const file of walk(srcDir)) {
  const text = readFileSync(file, 'utf8')
  if (forbiddenImport.test(text) || text.includes('moderationMocks')) {
    bad.push(file)
  }
}

if (bad.length > 0) {
  console.error('check-e2e-hooks-isolated: src imports e2e mocks:')
  for (const file of bad) console.error(`  ${file}`)
  process.exit(1)
}

console.log('check-e2e-hooks-isolated: OK (src has no e2e mock imports)')
