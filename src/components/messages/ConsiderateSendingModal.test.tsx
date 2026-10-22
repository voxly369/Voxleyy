import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { ConsiderateSendingModal } from './ConsiderateSendingModal.tsx'

describe('ConsiderateSendingModal', () => {
  it('confirms send anyway', () => {
    const onSend = vi.fn()
    render(
      <ModalStackProvider>
        <ConsiderateSendingModal
          open
          displayName="Writer"
          quietStatus={{ on: true, endsAt: null, label: 'later' }}
          onCancel={vi.fn()}
          onSendAnyway={onSend}
        />
      </ModalStackProvider>,
    )
    fireEvent.click(screen.getByTestId('considerate-send-confirm'))
    expect(onSend).toHaveBeenCalled()
  })
})
