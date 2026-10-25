import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessagesSectionTabs } from './MessagesSectionTabs.tsx'

describe('MessagesSectionTabs', () => {
  it('renders three tabs and notifies on change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<MessagesSectionTabs active="direct" onChange={onChange} />)
    expect(screen.getByRole('tab', { name: 'Direct' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Communities' }))
    expect(onChange).toHaveBeenCalledWith('communities')
  })
})
