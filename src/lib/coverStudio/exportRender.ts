import { COVER_STICKERS } from './stickers.generated.ts'
import type { CoverDesignDocument, CoverLayer } from './designSchema.ts'
import { COVER_DESIGN_HEIGHT, COVER_DESIGN_WIDTH } from './designSchema.ts'
import { ensureDesignFontsLoaded, ensureCoverFontFamilyLoaded } from './fonts/catalog.ts'

export type CoverImageSource = (storageKey: string) => Promise<HTMLImageElement | null>

export type CoverExportFormat = 'png' | 'jpeg'

export type CoverExportOptions = {
  format?: CoverExportFormat
  jpegQuality?: number
  resolveImage?: CoverImageSource
}

const stickerSvgCache = new Map<string, Promise<HTMLImageElement>>()

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image-load'))
    img.src = url
  })
}

function stickerImage(stickerId: string): Promise<HTMLImageElement> {
  const cached = stickerSvgCache.get(stickerId)
  if (cached) return cached
  const sticker = COVER_STICKERS.find((s) => s.id === stickerId)
  if (!sticker) return Promise.reject(new Error('sticker'))
  const promise = (async () => {
    const blob = new Blob([sticker.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    try {
      return await loadImageFromUrl(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  })()
  stickerSvgCache.set(stickerId, promise)
  return promise
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const raw = text.replace(/\r\n/g, '\n')
  const paragraphs = raw.split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
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
  }
  return lines
}

function applyLayerTransform(ctx: CanvasRenderingContext2D, layer: CoverLayer): void {
  const cx = layer.x + layer.width / 2
  const cy = layer.y + layer.height / 2
  ctx.translate(cx, cy)
  ctx.rotate((layer.rotation * Math.PI) / 180)
  ctx.translate(-layer.width / 2, -layer.height / 2)
}

function drawImageFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  fit: 'fill' | 'contain' | 'cover',
  width: number,
  height: number,
  flipX: boolean,
  flipY: boolean,
): void {
  ctx.save()
  if (flipX) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  if (flipY) {
    ctx.translate(0, height)
    ctx.scale(1, -1)
  }
  const scale =
    fit === 'fill'
      ? { sx: width / img.width, sy: height / img.height }
      : fit === 'contain'
        ? (() => {
            const s = Math.min(width / img.width, height / img.height)
            return { sx: s, sy: s }
          })()
        : (() => {
            const s = Math.max(width / img.width, height / img.height)
            return { sx: s, sy: s }
          })()
  const dw = img.width * scale.sx
  const dh = img.height * scale.sy
  const dx = (width - dw) / 2
  const dy = (height - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()
}

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  doc: CoverDesignDocument,
  resolveImage: CoverImageSource | undefined,
  width: number,
  height: number,
): Promise<void> {
  const bg = doc.background
  if (bg.type === 'solid') {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, width, height)
    return
  }
  if (bg.type === 'gradient') {
    const angleRad = ((bg.angle - 90) * Math.PI) / 180
    const half = Math.max(width, height)
    const x0 = width / 2 - Math.cos(angleRad) * half
    const y0 = height / 2 - Math.sin(angleRad) * half
    const x1 = width / 2 + Math.cos(angleRad) * half
    const y1 = height / 2 + Math.sin(angleRad) * half
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
    for (const stop of bg.stops) gradient.addColorStop(stop.offset, stop.color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    return
  }
  if (bg.type === 'pattern') {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, width, height)
    const step = 24 * bg.scale
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = -height; x < width + height; x += step) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x + height, height)
    }
    ctx.stroke()
    return
  }
  if (bg.type === 'image' && resolveImage) {
    const img = await resolveImage(bg.storageKey)
    if (img) {
      drawImageFit(ctx, img, bg.fit, width, height, false, false)
      return
    }
  }
  ctx.fillStyle = '#3d2c24'
  ctx.fillRect(0, 0, width, height)
}

async function drawTextLayer(ctx: CanvasRenderingContext2D, layer: Extract<CoverLayer, { type: 'text' }>): Promise<void> {
  const entry = await ensureCoverFontFamilyLoaded(layer.fontFamily)
  const family = entry?.family ?? `${layer.fontFamily}, serif`
  const style = layer.fontStyle === 'italic' ? 'italic' : 'normal'
  ctx.font = `${style} ${layer.fontWeight} ${layer.fontSize}px ${family}`
  ctx.textBaseline = 'top'
  const content = layer.uppercase ? layer.text.toUpperCase() : layer.text
  const lines = wrapTextLines(ctx, content, layer.width)
  const lineHeightPx = layer.fontSize * layer.lineHeight
  let y = 0
  for (const line of lines) {
    let x = 0
    if (layer.align === 'center') {
      ctx.textAlign = 'center'
      x = layer.width / 2
    } else if (layer.align === 'right') {
      ctx.textAlign = 'right'
      x = layer.width
    } else {
      ctx.textAlign = 'left'
      x = 0
    }
    if (layer.highlight) {
      const metrics = ctx.measureText(line)
      const pad = layer.highlight.padding
      const w = metrics.width + pad * 2
      const h = layer.fontSize + pad * 2
      let hx = x
      if (layer.align === 'center') hx = x - w / 2
      else if (layer.align === 'right') hx = x - w
      ctx.fillStyle = layer.highlight.color
      ctx.fillRect(hx, y - pad / 2, w, h)
    }
    if (layer.shadow) {
      ctx.shadowColor = layer.shadow.color
      ctx.shadowBlur = layer.shadow.blur
      ctx.shadowOffsetX = layer.shadow.offsetX
      ctx.shadowOffsetY = layer.shadow.offsetY
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }
    ctx.fillStyle = layer.color
    if (layer.outline && layer.outline.width > 0) {
      ctx.lineWidth = layer.outline.width
      ctx.strokeStyle = layer.outline.color
      ctx.strokeText(line, x, y)
    }
    ctx.fillText(line, x, y)
    y += lineHeightPx
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

async function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: CoverLayer,
  resolveImage: CoverImageSource | undefined,
): Promise<void> {
  if (layer.hidden) return
  ctx.save()
  ctx.globalAlpha = layer.opacity
  applyLayerTransform(ctx, layer)

  if (layer.type === 'text') {
    await drawTextLayer(ctx, layer)
  } else if (layer.type === 'sticker') {
    try {
      const img = await stickerImage(layer.stickerId)
      ctx.drawImage(img, 0, 0, layer.width, layer.height)
    } catch {
      // skip missing sticker
    }
  } else if (layer.type === 'image' && resolveImage) {
    const img = await resolveImage(layer.storageKey)
    if (img) {
      ctx.save()
      const filters: string[] = []
      if (layer.brightness !== 100) filters.push(`brightness(${layer.brightness}%)`)
      if (layer.contrast !== 100) filters.push(`contrast(${layer.contrast}%)`)
      if (layer.saturation !== 100) filters.push(`saturate(${layer.saturation}%)`)
      if (layer.blur > 0) filters.push(`blur(${layer.blur}px)`)
      ctx.filter = filters.length ? filters.join(' ') : 'none'
      drawImageFit(ctx, img, layer.fit, layer.width, layer.height, layer.flipX, layer.flipY)
      ctx.restore()
      if (layer.overlayColor) {
        ctx.fillStyle = layer.overlayColor
        ctx.fillRect(0, 0, layer.width, layer.height)
      }
    }
  } else if (layer.type === 'rect' || layer.type === 'roundRect' || layer.type === 'frame') {
    if (layer.fill) {
      ctx.fillStyle = layer.fill
      if (layer.type === 'roundRect' && layer.cornerRadius) {
        roundRect(ctx, 0, 0, layer.width, layer.height, layer.cornerRadius)
        ctx.fill()
      } else {
        ctx.fillRect(0, 0, layer.width, layer.height)
      }
    }
    if (layer.stroke && layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.stroke
      ctx.lineWidth = layer.strokeWidth
      if (layer.type === 'roundRect' && layer.cornerRadius) {
        roundRect(ctx, 0, 0, layer.width, layer.height, layer.cornerRadius)
        ctx.stroke()
      } else if (layer.type === 'frame') {
        const inset = layer.strokeWidth
        ctx.strokeRect(inset / 2, inset / 2, layer.width - inset, layer.height - inset)
      } else {
        ctx.strokeRect(0, 0, layer.width, layer.height)
      }
    }
  } else if (layer.type === 'circle') {
    ctx.beginPath()
    ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2)
    if (layer.fill) {
      ctx.fillStyle = layer.fill
      ctx.fill()
    }
    if (layer.stroke && layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.stroke
      ctx.lineWidth = layer.strokeWidth
      ctx.stroke()
    }
  } else if (layer.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(0, layer.height / 2)
    ctx.lineTo(layer.width, layer.height / 2)
    ctx.strokeStyle = layer.stroke ?? layer.fill ?? '#ffffff'
    ctx.lineWidth = layer.strokeWidth || 2
    ctx.stroke()
  }

  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export async function renderCoverDesignToCanvas(
  doc: CoverDesignDocument,
  options: CoverExportOptions = {},
): Promise<HTMLCanvasElement> {
  const width = doc.width || COVER_DESIGN_WIDTH
  const height = doc.height || COVER_DESIGN_HEIGHT
  const families = doc.layers.filter((l): l is Extract<CoverLayer, { type: 'text' }> => l.type === 'text').map((l) => l.fontFamily)
  await ensureDesignFontsLoaded(families)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')

  await drawBackground(ctx, doc, options.resolveImage, width, height)
  for (const layer of doc.layers) {
    await drawLayer(ctx, layer, options.resolveImage)
  }
  return canvas
}

export async function renderCoverDesignBlob(
  doc: CoverDesignDocument,
  options: CoverExportOptions = {},
): Promise<Blob> {
  const canvas = await renderCoverDesignToCanvas(doc, options)
  const format = options.format ?? 'png'
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const quality = options.jpegQuality ?? 0.92
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('export'))), mime, quality)
  })
}
