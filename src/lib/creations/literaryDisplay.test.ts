import { describe, expect, it } from 'vitest'
import {
  literaryLinesFromBody,
  literaryLinesFromRich,
  literaryStanzasFromLines,
  trimLiteraryLines,
  trimLiteraryPlainText,
  trimLiteraryRichDocument,
} from './literaryDisplay.ts'
import type { RichBodyDocument } from './richDocument.ts'

describe('literaryDisplay', () => {
  it('builds stanzas from blank lines', () => {
    expect(literaryStanzasFromLines(['a', 'b', '', 'c'])).toEqual([['a', 'b'], ['c']])
  })

  it('trims leading and trailing blank lines', () => {
    expect(trimLiteraryLines(['', 'a', ''])).toEqual(['a'])
    expect(trimLiteraryPlainText('\n\nLine one\n\n')).toBe('Line one')
  })

  it('treats each legacy paragraph as one line', () => {
    const doc: RichBodyDocument = {
      version: 1,
      format: 'rich',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First line' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second line' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Next stanza' }] },
      ],
    }
    expect(literaryLinesFromRich(doc)).toEqual(['First line', 'Second line', '', 'Next stanza'])
    expect(literaryStanzasFromLines(literaryLinesFromRich(doc))).toEqual([
      ['First line', 'Second line'],
      ['Next stanza'],
    ])
  })

  it('handles multi-line single paragraph with hard breaks', () => {
    const doc: RichBodyDocument = {
      version: 1,
      format: 'rich',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line A' }, { type: 'hardBreak' }, { type: 'text', text: 'Line B' }],
        },
      ],
    }
    expect(literaryLinesFromRich(doc)).toEqual(['Line A\nLine B'])
  })

  it('trims rich documents on publish boundaries', () => {
    const doc: RichBodyDocument = {
      version: 1,
      format: 'rich',
      content: [
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Only' }] },
        { type: 'paragraph' },
      ],
    }
    const trimmed = trimLiteraryRichDocument(doc)
    expect(literaryLinesFromRich(trimmed)).toEqual(['Only'])
  })

  it('reads plain body text lines', () => {
    expect(literaryLinesFromBody(null, 'One\nTwo\n\nThree')).toEqual(['One', 'Two', '', 'Three'])
  })
})
