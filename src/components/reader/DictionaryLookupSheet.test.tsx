import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DictionaryLookupSheet } from './DictionaryLookupSheet.tsx'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'

describe('DictionaryLookupSheet', () => {
  it('shows a successful definition', () => {
    render(
      <ModalStackProvider>
        <DictionaryLookupSheet
          open
          word="hello"
          loading={false}
          result={{ status: 'success', entry: { word: 'hello', partOfSpeech: 'noun', definition: 'A greeting.' } }}
          onClose={vi.fn()}
        />
      </ModalStackProvider>,
    )
    expect(screen.getByText('A greeting.')).toBeInTheDocument()
  })

  it('shows offline copy', () => {
    render(
      <ModalStackProvider>
        <DictionaryLookupSheet open word="hello" loading={false} result={{ status: 'offline' }} onClose={vi.fn()} />
      </ModalStackProvider>,
    )
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })
})
