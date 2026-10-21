import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { CoverFrame } from './CoverFrame.tsx'

describe('CoverFrame', () => {
  it('uses 16:9 aspect ratio and centred object cover', () => {
    const { container } = render(<CoverFrame src="https://example.com/cover.webp" />)
    const frame = container.firstElementChild
    expect(frame?.className).toMatch(/aspect-video/)
    const img = container.querySelector('img')
    expect(img?.className).toMatch(/object-cover/)
    expect(img?.className).toMatch(/object-center/)
  })
})
