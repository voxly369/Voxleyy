import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalStackProvider } from '../../lib/shell/modalStack.tsx'
import { PublishSheet } from './PublishSheet.tsx'

describe('PublishSheet mood picker', () => {
  it('includes mood in publish confirm payload', async () => {
    const onConfirm = vi.fn()
    render(
      <ModalStackProvider>
        <PublishSheet
          open
          onClose={() => {}}
          title="Title"
          body="Body line"
          caption=""
          tags={[]}
          coverUrl={null}
          creationType="written_post"
          initialAudience="public"
          initialMood={null}
          mode="publish"
          busy={false}
          error={null}
          onConfirm={onConfirm}
        />
      </ModalStackProvider>,
    )
    await userEvent.selectOptions(screen.getByLabelText(/mood/i), 'hope')
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }))
    expect(onConfirm).toHaveBeenCalledWith({ audience: 'public', mood: 'hope', language: 'en' })
  })
})
