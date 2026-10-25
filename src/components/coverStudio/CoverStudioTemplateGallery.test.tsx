import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverStudioTemplateGallery } from './CoverStudioTemplateGallery.tsx'
import { COVER_TEMPLATES } from '../../lib/coverStudio/templates.generated.ts'

describe('CoverStudioTemplateGallery', () => {
  it('applies template when clicked', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<CoverStudioTemplateGallery onApply={onApply} />)
    const first = COVER_TEMPLATES[0]
    await user.click(screen.getByRole('button', { name: first.name }))
    expect(onApply).toHaveBeenCalledWith(first.id)
  })
})
