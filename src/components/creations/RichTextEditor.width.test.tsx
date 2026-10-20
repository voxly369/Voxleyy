import { describe, expect, it } from 'vitest'

// Rich editor width is configured on the TipTap editor class string.
import { readFileSync } from 'node:fs'
import path from 'node:path'

describe('RichTextEditor width', () => {
  it('uses full width in the editor surface (no max-w-[65ch])', () => {
    const source = readFileSync(path.join(process.cwd(), 'src/components/creations/RichTextEditor.tsx'), 'utf8')
    expect(source).toContain('w-full')
    expect(source).not.toContain('max-w-[65ch]')
  })
})
