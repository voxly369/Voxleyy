import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { CoverStudioTextInspector } from './CoverStudioTextInspector.tsx'

const textLayer = {
  id: 'title',
  type: 'text' as const,
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  text: 'Hello cover',
  fontFamily: 'Fraunces',
  fontSize: 48,
  fontWeight: 600,
  fontStyle: 'normal' as const,
  color: '#fff',
  align: 'center' as const,
  lineHeight: 1.1,
  letterSpacing: 0,
  uppercase: false,
  shadow: null,
  outline: null,
  highlight: null,
}

afterEach(() => cleanup())

describe('CoverStudioTextInspector typography', () => {
  it('weight', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    await user.selectOptions(screen.getByTestId('cover-text-weight'), '700')
    expect(onChange).toHaveBeenCalledWith({ fontWeight: 700 })
  })

  it('italic', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    await user.click(screen.getByTestId('cover-text-italic'))
    expect(onChange).toHaveBeenCalledWith({ fontStyle: 'italic' })
  })

  it('alignment', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    await user.click(screen.getByTestId('cover-text-align-left'))
    expect(onChange).toHaveBeenCalledWith({ align: 'left' })
  })

  it('line height', () => {
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-text-line-height'), { target: { value: '1.5' } })
    expect(onChange).toHaveBeenCalledWith({ lineHeight: 1.5 })
  })

  it('letter spacing', () => {
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-text-letter-spacing'), { target: { value: '4' } })
    expect(onChange).toHaveBeenCalledWith({ letterSpacing: 4 })
  })

  it('shadow', () => {
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-text-shadow'), { target: { value: '8' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ shadow: expect.objectContaining({ blur: 8 }) }),
    )
  })

  it('outline', () => {
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-text-outline'), { target: { value: '3' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ outline: expect.objectContaining({ width: 3 }) }),
    )
  })

  it('highlight', () => {
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-text-highlight'), { target: { value: '6' } })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ highlight: expect.objectContaining({ padding: 6 }) }),
    )
  })

  it('opacity', () => {
    const onChange = vi.fn()
    render(<CoverStudioTextInspector layer={textLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-text-opacity'), { target: { value: '0.5' } })
    expect(onChange).toHaveBeenCalledWith({ opacity: 0.5 })
  })
})
