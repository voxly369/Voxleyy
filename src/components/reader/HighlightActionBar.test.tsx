import { describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { HighlightActionBar } from './HighlightActionBar.tsx'

describe('HighlightActionBar', () => {
  afterEach(() => cleanup())
  it('fires colour and action handlers', async () => {
    const onColour = vi.fn()
    const onCopy = vi.fn()
    const user = userEvent.setup()
    render(
      <HighlightActionBar
        open
        top={10}
        left={10}
        canShareQuote
        onColour={onColour}
        onAddNote={() => {}}
        onCopy={onCopy}
        onLookUp={() => {}}
        onShareQuote={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Highlight Yellow' }))
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(onColour).toHaveBeenCalledWith('yellow')
    expect(onCopy).toHaveBeenCalled()
  })

  it('hides share quote when not public', () => {
    render(
      <HighlightActionBar
        open
        top={0}
        left={0}
        canShareQuote={false}
        onColour={() => {}}
        onAddNote={() => {}}
        onCopy={() => {}}
        onLookUp={() => {}}
        onShareQuote={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Share quote' })).not.toBeInTheDocument()
  })
})
