import { describe, expect, it, afterEach } from 'vitest'
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextEditor } from './RichTextEditor.tsx'
import { emptyRichDocument } from '../../lib/creations/bodyDocument.ts'

describe('RichTextEditor toolbar', () => {
  afterEach(() => cleanup())

  it('toggles aria-pressed on Bold', async () => {
    const user = userEvent.setup()
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={() => {}}
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

  it('omits aria-pressed on Undo and Redo history buttons', async () => {
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={() => {}}
        onBlur={() => {}}
      />,
    )
    const undo = await screen.findByRole('button', { name: 'Undo' })
    const redo = screen.getByRole('button', { name: 'Redo' })
    expect(undo).not.toHaveAttribute('aria-pressed')
    expect(redo).not.toHaveAttribute('aria-pressed')
  })

  it('enables Undo after an edit and skips disabled buttons when roving', async () => {
    const user = userEvent.setup()
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={() => {}}
        onBlur={() => {}}
      />,
    )
    const editor = await screen.findByRole('textbox', { name: 'Write your piece' })
    await user.click(editor)
    await user.keyboard('Hi')
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo).not.toBeDisabled()
    const bold = screen.getByRole('button', { name: 'Bold' })
    await act(async () => {
      undo.focus()
    })
    await act(async () => {
      fireEvent.keyDown(undo, { key: 'ArrowRight' })
    })
    expect(document.activeElement).toBe(bold)
  })

  it('applies bold with Ctrl+B', async () => {
    const user = userEvent.setup()
    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={false}
        onChange={() => {}}
        onBlur={() => {}}
      />,
    )
    const textbox = await screen.findByRole('textbox', { name: 'Write your piece' })
    await user.click(textbox)
    await user.keyboard('{Control>}b{/Control}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
  })
})
