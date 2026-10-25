/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyCoverDesign } from './designSchema.ts'
import { renderCoverDesignBlob, renderCoverDesignToCanvas } from './exportRender.ts'

function mockCanvasContext() {
  const state = { fillStyle: '#000000' }
  return {
    fillStyle: '#000000',
    set fillStyle(v: string) {
      state.fillStyle = v
    },
    get fillStyle() {
      return state.fillStyle
    },
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([0x11, 0x22, 0x33, 255]),
    })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    ellipse: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
    textBaseline: 'top',
    textAlign: 'left',
    lineWidth: 1,
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    filter: 'none',
  } as unknown as CanvasRenderingContext2D
}

describe('exportRender', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockCanvasContext())
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
      cb?.(new Blob(['png'], { type: 'image/png' }))
    })
  })

  it('renders solid background to canvas dimensions', async () => {
    const doc = emptyCoverDesign()
    doc.background = { type: 'solid', color: '#112233' }
    const canvas = await renderCoverDesignToCanvas(doc)
    expect(canvas.width).toBe(1600)
    expect(canvas.height).toBe(2400)
  })

  it('exports png blob', async () => {
    const doc = emptyCoverDesign()
    const blob = await renderCoverDesignBlob(doc, { format: 'png' })
    expect(blob.type).toBe('image/png')
  })

  it('uses resolveImage for image background when provided', async () => {
    const doc = emptyCoverDesign()
    doc.background = { type: 'image', storageKey: 'bg.webp', fit: 'cover' }
    const img = { width: 100, height: 150 } as HTMLImageElement
    const resolveImage = vi.fn(async () => img)
    const canvas = await renderCoverDesignToCanvas(doc, { resolveImage })
    expect(resolveImage).toHaveBeenCalledWith('bg.webp')
    expect(canvas.width).toBe(1600)
  })
})
