import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextEditor } from './RichTextEditor.tsx'
import { emptyRichDocument } from '../../lib/creations/bodyDocument.ts'

describe('RichTextEditor toolbar', () => {
  afterEach(() => cleanup())

  it('toggles aria-pressed on Bold', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={onChange}
        onBlur={() => {}}
      />,
    )
    const bold = await screen.findByRole('button', { name: 'Bold' })
    expect(bold).toHaveAttribute('aria-pressed', 'false')
    await user.click(bold)
    expect(bold).toHaveAttribute('aria-pressed', 'true')
  })

  it('supports roving focus with arrow keys in the toolbar', async () => {
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={() => {}}
        onBlur={() => {}}
      />,
    )
    const bold = await screen.findByRole('button', { name: 'Bold' })
    const italic = screen.getByRole('button', { name: 'Italic' })
    await act(async () => {
      bold.focus()
    })
    await act(async () => {
      fireEvent.keyDown(bold, { key: 'ArrowRight' })
    })
    expect(document.activeElement).toBe(italic)
  })

  it('applies bold with Ctrl+B', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={onChange}
        onBlur={() => {}}
      />,
    )
    const textbox = await screen.findByRole('textbox', { name: 'Write your piece' })
    await user.click(textbox)
    await user.keyboard('{Control>}b{/Control}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
  })
})
