export type Rgb = { r: number; g: number; b: number }

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)))
}

export function parseHexColor(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, '')
  if (hex.length === 3) {
    const r = parseInt(hex[0]! + hex[0], 16)
    const g = parseInt(hex[1]! + hex[1], 16)
    const b = parseInt(hex[2]! + hex[2], 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return { r, g, b }
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
    return { r, g, b }
  }
  return null
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsWcagAaLargeText(ratio: number): boolean {
  return ratio >= 3
}

export function meetsWcagAaBodyText(ratio: number): boolean {
  return ratio >= 4.5
}

export function averageImageRgb(pixels: Uint8ClampedArray): Rgb {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 255
    if (alpha < 16) continue
    r += pixels[i] ?? 0
    g += pixels[i + 1] ?? 0
    b += pixels[i + 2] ?? 0
    count += 1
  }
  if (count === 0) return { r: 128, g: 128, b: 128 }
  return { r: clampByte(r / count), g: clampByte(g / count), b: clampByte(b / count) }
}

export function suggestCoverTextColor(background: Rgb): '#ffffff' | '#1a100a' {
  const whiteContrast = contrastRatio({ r: 255, g: 255, b: 255 }, background)
  const darkContrast = contrastRatio({ r: 26, g: 16, b: 10 }, background)
  return whiteContrast >= darkContrast ? '#ffffff' : '#1a100a'
}
