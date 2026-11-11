import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BOOK_BODY_FONT_FAMILY,
  BOOK_HEADING_FONT_FAMILY,
  BOOK_UI_FONT_FAMILY,
  BOOK_WRITING_FONT_PACKAGES,
} from './bookFonts.ts'

const packageJson = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'), 'utf8'),
) as { dependencies?: Record<string, string> }

describe('bookFonts', () => {
  it('exposes Literata, Inter, and Cormorant Garamond stacks', () => {
    expect(BOOK_BODY_FONT_FAMILY).toContain('Literata')
    expect(BOOK_UI_FONT_FAMILY).toContain('Inter')
    expect(BOOK_HEADING_FONT_FAMILY).toContain('Cormorant Garamond')
  })

  it('declares each book-writing Fontsource package in package.json', () => {
    const deps = packageJson.dependencies ?? {}
    for (const name of BOOK_WRITING_FONT_PACKAGES) {
      expect(deps[name], `missing dependency ${name}`).toBeTruthy()
    }
  })
})
