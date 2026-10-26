/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { prepareBookCoverImport } from './importCover.ts'

function mockBitmap(width: number, height: number) {
  return {
    width,
    height,
    close: vi.fn(),
  } as unknown as ImageBitmap
}

describe('prepareBookCoverImport', () => {
  beforeEach(() => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => mockBitmap(2400, 1600)))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
        }) as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
    ) {
      cb(new Blob(['webp'], { type: 'image/webp' }))
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('centre-crops to 2:3 and returns 1600x2400', async () => {
    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 1024 })
    const result = await prepareBookCoverImport(file)
    expect(result.width).toBe(1600)
    expect(result.height).toBe(2400)
    expect(result.contentType).toBe('image/webp')
  })
})
