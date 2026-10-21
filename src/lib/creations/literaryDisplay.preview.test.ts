import { describe, expect, it } from 'vitest'
import {
  literaryLinesFromPlainText,
  literaryPreviewExcerpt,
  literaryStanzasFromLines,
} from './literaryDisplay.ts'

const PROSE_POEM = [
  'Its is a stubborn thing. It sits in the chest like a stone. It will not move for pleading.',
  'Second paragraph opens with rain on glass. The city breathes out steam and memory.',
  'Third paragraph holds the northern light. Watcher, waiting, without a name.',
].join('\n\n')

describe('literaryPreviewExcerpt', () => {
  it('treats prose paragraphs separated by blank lines as one stanza (no extra gaps)', () => {
    const { lines } = literaryPreviewExcerpt(null, PROSE_POEM, 20)
    const stanzas = literaryStanzasFromLines(lines)
    expect(stanzas.length).toBe(1)
    expect(stanzas[0]?.length).toBeGreaterThanOrEqual(3)
  })

  it('collapses three or more consecutive blank lines to one stanza break', () => {
    const text = 'Line one\nLine two\n\n\n\nLine three'
    const lines = literaryLinesFromPlainText(text)
    const stanzas = literaryStanzasFromLines(lines)
    expect(stanzas).toEqual([['Line one', 'Line two'], ['Line three']])
  })

  it('keeps classic line-per-line stanzas', () => {
    const text = 'Rose\nAre red\n\nViolets\nAre blue'
    const { lines } = literaryPreviewExcerpt(null, text, 10)
    const stanzas = literaryStanzasFromLines(lines)
    expect(stanzas).toEqual([
      ['Rose', 'Are red'],
      ['Violets', 'Are blue'],
    ])
  })

  it('clamps on whole literary lines after trim', () => {
    const text = 'One\nTwo\nThree\nFour\nFive\nSix\nSeven\nEight\nNine'
    const { lines, truncated } = literaryPreviewExcerpt(null, text, 4)
    expect(truncated).toBe(true)
    expect(lines).toEqual(['One', 'Two', 'Three', 'Four'])
  })

  it('ignores leading blank lines before excerpt', () => {
    const text = '\n\n\nWatcher of the Northern Light\nSecond line'
    const { lines } = literaryPreviewExcerpt(null, text, 6)
    expect(lines[0]).toBe('Watcher of the Northern Light')
  })
})
