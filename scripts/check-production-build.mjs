#!/usr/bin/env node
/**
 * Fails if production bundle contains e2e mock hooks, test-only markers, or source maps.
 * Run after `npm run build`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const distDir = join(process.cwd(), 'dist')
const forbidden = [
  'setModerationIsFounder',
  'setModerationOwnProfileStatus',
  'setModerationReportDuplicate',
  'moderationMockHandleRest',
  'resetModerationMocks',
  'moderationMocks.ts',
  'e2e/moderationMocks',
  '__VOXLY_E2E__',
  'VOXLY_E2E_MOCK',
]

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(path))
    else if (/\.(js|css|html|map)$/.test(entry.name)) files.push(path)
  }
  return files
}

let distFiles
try {
  distFiles = walk(distDir)
} catch {
  console.error('check-production-build: dist/ missing — run npm run build first')
  process.exit(1)
}

const mapFiles = distFiles.filter((file) => file.endsWith('.map'))
if (mapFiles.length > 0) {
  console.error('check-production-build: source map files must not ship in dist/:')
  for (const file of mapFiles) {
    console.error(`  ${file.replace(process.cwd() + '/', '')}`)
  }
  process.exit(1)
}

const sourceMappingHits = []
for (const file of distFiles.filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(file, 'utf8')
  if (text.includes('sourceMappingURL=')) {
    sourceMappingHits.push(file)
  }
}
if (sourceMappingHits.length > 0) {
  console.error('check-production-build: sourceMappingURL references in JS output:')
  for (const file of sourceMappingHits) {
    console.error(`  ${file.replace(process.cwd() + '/', '')}`)
  }
  process.exit(1)
}

const hits = []
for (const file of distFiles) {
  const text = readFileSync(file, 'utf8')
  for (const marker of forbidden) {
    if (text.includes(marker)) hits.push({ file, marker })
  }
}

if (hits.length > 0) {
  console.error('check-production-build: forbidden markers in production output:')
  for (const { file, marker } of hits) {
    console.error(`  ${marker} in ${file.replace(process.cwd() + '/', '')}`)
  }
  process.exit(1)
}

console.log(
  `check-production-build: OK (scanned ${distFiles.length} files, no maps, no e2e hook markers)`,
)
