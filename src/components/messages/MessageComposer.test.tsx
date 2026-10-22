import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MessageComposer } from './MessageComposer.tsx'

describe('MessageComposer', () => {
  it('shows character counter and sends trimmed body', () => {
    const onSend = vi.fn()
    render(<MessageComposer onSend={onSend} />)
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '  Hi ' } })
    expect(screen.getByTestId('message-char-count')).toHaveTextContent(String(2000 - 5))
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalledWith({ body: 'Hi', deliverAt: null, sharedCreationId: null })
  })
})
