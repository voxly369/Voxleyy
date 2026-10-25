import { describe, expect, it } from 'vitest'
import { validateImageFile } from './imageFile.ts'

describe('validateImageFile', () => {
  it('rejects non-image types', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
  })

  it('rejects oversized images', () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.webp', { type: 'image/webp' })
    const result = validateImageFile(big)
    expect(result.ok).toBe(false)
  })

  it('accepts a small webp image', () => {
    const file = new File([new Uint8Array(1024)], 'ok.webp', { type: 'image/webp' })
    const result = validateImageFile(file)
    expect(result.ok).toBe(true)
  })
})
