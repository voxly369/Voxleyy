import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextEditor } from './RichTextEditor.tsx'
import { emptyRichDocument, richToPlainText } from '../../lib/creations/bodyDocument.ts'
import { PASTE_TOO_LONG_MESSAGE } from '../../lib/creations/richPaste.ts'
import { MAX_BODY_TEXT_OCTETS } from '../../lib/creations/limits.ts'

describe('RichTextEditor paste', () => {
  afterEach(() => cleanup())

  it('pastes a three-stanza poem as paragraphs with hard breaks', async () => {
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
    await user.click(await screen.findByRole('textbox', { name: 'Write your piece' }))
    const surface = document.querySelector('.ProseMirror')
    expect(surface).toBeTruthy()

    const poem = 'S1L1\nS1L2\n\nS2L1\nS2L2\n\nS3L1\nS3L2'
    await act(async () => {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => poem },
      })
      surface!.dispatchEvent(event)
    })

    await waitFor(() => expect(onChange).toHaveBeenCalled())

    expect(onChange).toHaveBeenCalled()
    const doc = onChange.mock.calls.at(-1)?.[0]
    expect(doc.content.filter((block: { type: string }) => block.type === 'paragraph')).toHaveLength(3)
    const plain = richToPlainText(doc)
    expect(plain).toContain('S1L1')
    expect(plain).toContain('S3L2')
  })

  it('refuses over-limit paste and inserts nothing', async () => {
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
    await user.click(await screen.findByRole('textbox', { name: 'Write your piece' }))
    const surface = document.querySelector('.ProseMirror')
    expect(surface).toBeTruthy()

    const huge = 'x'.repeat(MAX_BODY_TEXT_OCTETS + 50)
    await act(async () => {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => huge },
      })
      surface!.dispatchEvent(event)
    })

    expect(await screen.findByRole('status')).toHaveTextContent(PASTE_TOO_LONG_MESSAGE)
    expect(onChange).not.toHaveBeenCalled()
  })
})
