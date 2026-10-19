import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextEditor } from './RichTextEditor.tsx'
import { emptyRichDocument, richToPlainText } from '../../lib/creations/bodyDocument.ts'

describe('RichTextEditor paste', () => {
  afterEach(() => cleanup())

  it('pastes structured stanzas instead of raw newline text nodes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={true}
        onChange={onChange}
        onBlur={() => {}}
      />,
    )
    const textbox = await screen.findByRole('textbox', { name: 'Write your piece' })
    await user.click(textbox)

    const poem = 'Line 1\nLine 2\n\nStanza 2'
    await act(async () => {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => poem },
      })
      textbox.dispatchEvent(event)
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    if (onChange.mock.calls.length > 0) {
      const doc = onChange.mock.calls.at(-1)?.[0]
      expect(richToPlainText(doc)).toContain('Line 1')
      expect(richToPlainText(doc)).toContain('Stanza 2')
    }
  })
})
