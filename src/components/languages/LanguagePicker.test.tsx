import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguagePicker } from './LanguagePicker.tsx'

describe('LanguagePicker', () => {
  it('filters options by search and calls onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LanguagePicker value="en" onChange={onChange} />)
    await user.type(screen.getByTestId('language-picker-search'), 'afri')
    await user.selectOptions(screen.getByTestId('language-picker-select'), 'af')
    expect(onChange).toHaveBeenCalledWith('af')
  })
})
