#!/usr/bin/env node
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'supabase', 'migrations')
const files = readdirSync(dir).filter((name) => name.endsWith('.sql'))
const byVersion = new Map()

for (const file of files) {
  const match = /^(\d{14})_/.exec(file)
  if (!match) {
    console.error(`check-migration-versions: no version prefix on ${file}`)
    process.exit(1)
  }
  const version = match[1]
  const list = byVersion.get(version) ?? []
  list.push(file)
  byVersion.set(version, list)
}

const duplicates = [...byVersion.entries()].filter(([, list]) => list.length > 1)
if (duplicates.length > 0) {
  console.error('check-migration-versions: duplicate migration version prefixes:')
  for (const [version, list] of duplicates) {
    console.error(`  ${version}: ${list.join(', ')}`)
  }
  process.exit(1)
}

console.log(`check-migration-versions: OK (${files.length} migrations, unique versions)`)
