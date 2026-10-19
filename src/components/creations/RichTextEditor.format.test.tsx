import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { RichTextEditor, FORMAT_UNREADABLE_MESSAGE } from './RichTextEditor.tsx'
import { emptyRichDocument } from '../../lib/creations/bodyDocument.ts'
import * as richEditorUpdate from '../../lib/creations/richEditorUpdate.ts'

describe('RichTextEditor format failures', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('shows aria-live status when conversion fails and save label stays unsaved', async () => {
    vi.spyOn(richEditorUpdate, 'processEditorJsonUpdate').mockReturnValueOnce({
      ok: false,
      revertTo: emptyRichDocument(),
    })

    render(
      <>
        <p data-testid="save-label">Saved</p>
        <RichTextEditor
          document={emptyRichDocument()}
          literaryLineBreaks={true}
          onChange={() => {
            screen.getByTestId('save-label').textContent = 'Unsaved'
          }}
          onBlur={() => {}}
          onStructureFailure={() => {
            screen.getByTestId('save-label').textContent = 'Not saved. Retry'
          }}
        />
      </>,
    )

    const surface = document.querySelector('.ProseMirror')
    expect(surface).toBeTruthy()
    await act(async () => {
      fireEvent.input(surface!, { target: { innerHTML: '<p>x</p>' } })
    })

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(FORMAT_UNREADABLE_MESSAGE)
    expect(screen.getByTestId('save-label')).toHaveTextContent('Not saved. Retry')
    expect(screen.getByTestId('save-label').textContent).not.toMatch(/^Saved$/)
  })

  it('clears the format status after a valid editor update', async () => {
    const processSpy = vi.spyOn(richEditorUpdate, 'processEditorJsonUpdate')
    processSpy
      .mockReturnValueOnce({ ok: false, revertTo: emptyRichDocument() })
      .mockReturnValueOnce({
        ok: true,
        doc: {
          ...emptyRichDocument(),
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'ok' }] }],
        },
        plain: 'ok',
      })

    render(
      <RichTextEditor
        document={emptyRichDocument()}
        literaryLineBreaks={true}
        onChange={() => {}}
        onBlur={() => {}}
      />,
    )

    const surface = document.querySelector('.ProseMirror')
    await act(async () => {
      fireEvent.input(surface!, { target: { innerHTML: '<p>a</p>' } })
    })
    expect(await screen.findByRole('status')).toHaveTextContent(FORMAT_UNREADABLE_MESSAGE)

    await act(async () => {
      fireEvent.input(surface!, { target: { innerHTML: '<p>ok</p>' } })
    })
    expect(screen.queryByText(FORMAT_UNREADABLE_MESSAGE)).toBeNull()
  })
})
