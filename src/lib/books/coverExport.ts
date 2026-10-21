import type { BookRecord } from './bookSchema.ts'
import { coverLayoutPreset, type CoverLayoutPresetId } from './coverStudioLayout.ts'

export const COVER_EXPORT_WIDTH = 1600
export const COVER_EXPORT_HEIGHT = 2400

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('cover-load'))
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let line = words[0] ?? ''
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) line = next
    else {
      lines.push(line)
      line = words[i] ?? ''
    }
  }
  lines.push(line)
  return lines
}

export async function renderBookCoverPng(input: {
  book: BookRecord
  authorName: string
  coverUrl: string | null
  layoutId: CoverLayoutPresetId
  textColor: string
  fallbackRgb?: { r: number; g: number; b: number }
}): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = COVER_EXPORT_WIDTH
  canvas.height = COVER_EXPORT_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')

  const fb = input.fallbackRgb ?? { r: 61, g: 44, b: 36 }
  ctx.fillStyle = `rgb(${fb.r}, ${fb.g}, ${fb.b})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (input.coverUrl) {
    const img = await loadImage(input.coverUrl)
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
  }

  const layout = coverLayoutPreset(input.layoutId)
  ctx.fillStyle = input.textColor
  ctx.textBaseline = 'middle'

  for (const box of layout.boxes) {
    const value =
      box.role === 'title'
        ? input.book.title
        : box.role === 'subtitle'
          ? input.book.subtitle ?? ''
          : input.authorName
    if (!value.trim()) continue
    const fontPx = (box.fontSizeRem / 16) * canvas.width * 0.09
    ctx.font = `${box.fontWeight} ${fontPx}px Fraunces, serif`
    const maxWidth = (box.maxWidthPercent / 100) * canvas.width
    const lines = wrapText(ctx, value, maxWidth)
    const x =
      box.textAlign === 'center'
        ? (box.xPercent / 100) * canvas.width
        : box.textAlign === 'right'
          ? ((box.xPercent + box.maxWidthPercent) / 100) * canvas.width
          : (box.xPercent / 100) * canvas.width
    let y = (box.yPercent / 100) * canvas.height
    const lineHeight = fontPx * 1.2
    for (const line of lines) {
      if (box.textAlign === 'center') ctx.textAlign = 'center'
      else if (box.textAlign === 'right') ctx.textAlign = 'right'
      else ctx.textAlign = 'left'
      ctx.fillText(line, x, y)
      y += lineHeight
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export'))), 'image/png')
  })
}
