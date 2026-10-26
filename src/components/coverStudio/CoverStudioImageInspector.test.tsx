import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { CoverStudioImageInspector } from './CoverStudioImageInspector.tsx'

const imageLayer = {
  id: 'img-1',
  type: 'image' as const,
  x: 0,
  y: 0,
  width: 400,
  height: 600,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  storageKey: 'test.webp',
  fit: 'cover' as const,
  flipX: false,
  flipY: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  overlayColor: null,
}

afterEach(() => cleanup())

describe('CoverStudioImageInspector filters', () => {
  it('brightness', () => {
    const onChange = vi.fn()
    render(<CoverStudioImageInspector layer={imageLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-image-brightness'), { target: { value: '110' } })
    expect(onChange).toHaveBeenCalledWith({ brightness: 110 })
  })

  it('contrast', () => {
    const onChange = vi.fn()
    render(<CoverStudioImageInspector layer={imageLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-image-contrast'), { target: { value: '120' } })
    expect(onChange).toHaveBeenCalledWith({ contrast: 120 })
  })

  it('saturation', () => {
    const onChange = vi.fn()
    render(<CoverStudioImageInspector layer={imageLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-image-saturation'), { target: { value: '80' } })
    expect(onChange).toHaveBeenCalledWith({ saturation: 80 })
  })

  it('blur', () => {
    const onChange = vi.fn()
    render(<CoverStudioImageInspector layer={imageLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-image-blur'), { target: { value: '4' } })
    expect(onChange).toHaveBeenCalledWith({ blur: 4 })
  })

  it('overlay', () => {
    const onChange = vi.fn()
    render(<CoverStudioImageInspector layer={imageLayer} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('cover-image-overlay'), { target: { value: '#112233' } })
    expect(onChange).toHaveBeenCalledWith({ overlayColor: '#11223399' })
  })
})
