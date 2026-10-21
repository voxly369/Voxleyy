export type CoverTextRole = 'title' | 'subtitle' | 'author'

export type CoverTextBox = {
  role: CoverTextRole
  xPercent: number
  yPercent: number
  maxWidthPercent: number
  fontSizeRem: number
  fontWeight: number
  textAlign: 'left' | 'center' | 'right'
}

export type CoverLayoutPresetId =
  | 'classic_center'
  | 'bottom_band'
  | 'top_stack'
  | 'left_anchor'
  | 'right_anchor'
  | 'diagonal_title'
  | 'minimal_lower'
  | 'bold_upper'
  | 'split_band'

export type CoverLayoutPreset = {
  id: CoverLayoutPresetId
  label: string
  boxes: CoverTextBox[]
}

export const COVER_LAYOUT_PRESETS: CoverLayoutPreset[] = [
  {
    id: 'classic_center',
    label: 'Classic centre',
    boxes: [
      { role: 'title', xPercent: 50, yPercent: 38, maxWidthPercent: 84, fontSizeRem: 2.25, fontWeight: 600, textAlign: 'center' },
      { role: 'subtitle', xPercent: 50, yPercent: 52, maxWidthPercent: 78, fontSizeRem: 1.1, fontWeight: 400, textAlign: 'center' },
      { role: 'author', xPercent: 50, yPercent: 82, maxWidthPercent: 70, fontSizeRem: 1, fontWeight: 500, textAlign: 'center' },
    ],
  },
  {
    id: 'bottom_band',
    label: 'Bottom band',
    boxes: [
      { role: 'title', xPercent: 8, yPercent: 72, maxWidthPercent: 84, fontSizeRem: 2, fontWeight: 600, textAlign: 'left' },
      { role: 'author', xPercent: 8, yPercent: 88, maxWidthPercent: 60, fontSizeRem: 0.95, fontWeight: 500, textAlign: 'left' },
    ],
  },
  {
    id: 'top_stack',
    label: 'Top stack',
    boxes: [
      { role: 'title', xPercent: 50, yPercent: 14, maxWidthPercent: 88, fontSizeRem: 2.1, fontWeight: 600, textAlign: 'center' },
      { role: 'subtitle', xPercent: 50, yPercent: 28, maxWidthPercent: 80, fontSizeRem: 1.05, fontWeight: 400, textAlign: 'center' },
      { role: 'author', xPercent: 50, yPercent: 42, maxWidthPercent: 70, fontSizeRem: 0.95, fontWeight: 500, textAlign: 'center' },
    ],
  },
  {
    id: 'left_anchor',
    label: 'Left anchor',
    boxes: [
      { role: 'title', xPercent: 6, yPercent: 20, maxWidthPercent: 72, fontSizeRem: 2.2, fontWeight: 600, textAlign: 'left' },
      { role: 'subtitle', xPercent: 6, yPercent: 36, maxWidthPercent: 68, fontSizeRem: 1.05, fontWeight: 400, textAlign: 'left' },
      { role: 'author', xPercent: 6, yPercent: 90, maxWidthPercent: 60, fontSizeRem: 0.95, fontWeight: 500, textAlign: 'left' },
    ],
  },
  {
    id: 'right_anchor',
    label: 'Right anchor',
    boxes: [
      { role: 'title', xPercent: 94, yPercent: 22, maxWidthPercent: 72, fontSizeRem: 2.1, fontWeight: 600, textAlign: 'right' },
      { role: 'author', xPercent: 94, yPercent: 88, maxWidthPercent: 55, fontSizeRem: 0.95, fontWeight: 500, textAlign: 'right' },
    ],
  },
  {
    id: 'diagonal_title',
    label: 'Diagonal title',
    boxes: [
      { role: 'title', xPercent: 12, yPercent: 55, maxWidthPercent: 78, fontSizeRem: 2.4, fontWeight: 700, textAlign: 'left' },
      { role: 'author', xPercent: 12, yPercent: 92, maxWidthPercent: 50, fontSizeRem: 0.9, fontWeight: 500, textAlign: 'left' },
    ],
  },
  {
    id: 'minimal_lower',
    label: 'Minimal lower',
    boxes: [
      { role: 'title', xPercent: 50, yPercent: 78, maxWidthPercent: 86, fontSizeRem: 1.85, fontWeight: 600, textAlign: 'center' },
      { role: 'author', xPercent: 50, yPercent: 92, maxWidthPercent: 70, fontSizeRem: 0.85, fontWeight: 400, textAlign: 'center' },
    ],
  },
  {
    id: 'bold_upper',
    label: 'Bold upper',
    boxes: [
      { role: 'title', xPercent: 50, yPercent: 10, maxWidthPercent: 92, fontSizeRem: 2.6, fontWeight: 700, textAlign: 'center' },
      { role: 'subtitle', xPercent: 50, yPercent: 24, maxWidthPercent: 85, fontSizeRem: 1.1, fontWeight: 400, textAlign: 'center' },
      { role: 'author', xPercent: 50, yPercent: 96, maxWidthPercent: 75, fontSizeRem: 0.9, fontWeight: 500, textAlign: 'center' },
    ],
  },
  {
    id: 'split_band',
    label: 'Split band',
    boxes: [
      { role: 'title', xPercent: 50, yPercent: 48, maxWidthPercent: 90, fontSizeRem: 2.15, fontWeight: 600, textAlign: 'center' },
      { role: 'subtitle', xPercent: 50, yPercent: 58, maxWidthPercent: 82, fontSizeRem: 1, fontWeight: 400, textAlign: 'center' },
      { role: 'author', xPercent: 50, yPercent: 68, maxWidthPercent: 70, fontSizeRem: 0.95, fontWeight: 500, textAlign: 'center' },
    ],
  },
]

export function coverLayoutPreset(id: CoverLayoutPresetId): CoverLayoutPreset {
  return COVER_LAYOUT_PRESETS.find((p) => p.id === id) ?? COVER_LAYOUT_PRESETS[0]!
}

export function coverBoxStyle(box: CoverTextBox): {
  left: string
  top: string
  maxWidth: string
  transform: string
  fontSize: string
  fontWeight: number
  textAlign: CoverTextBox['textAlign']
} {
  const anchorX = box.textAlign === 'center' ? '-50%' : box.textAlign === 'right' ? '-100%' : '0'
  return {
    left: `${box.xPercent}%`,
    top: `${box.yPercent}%`,
    maxWidth: `${box.maxWidthPercent}%`,
    transform: `translate(${anchorX}, -50%)`,
    fontSize: `${box.fontSizeRem}rem`,
    fontWeight: box.fontWeight,
    textAlign: box.textAlign,
  }
}
