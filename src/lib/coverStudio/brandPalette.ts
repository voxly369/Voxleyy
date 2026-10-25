export type CoverPaletteSwatch = {
  id: string
  label: string
  hex: string
}

/** Coral-forward brand palette for Cover Studio colour pickers. */
export const COVER_BRAND_PALETTE: CoverPaletteSwatch[] = [
  { id: 'coral-500', label: 'Coral', hex: '#FF5A3C' },
  { id: 'coral-600', label: 'Deep coral', hex: '#E8442A' },
  { id: 'coral-100', label: 'Blush', hex: '#FFE0DA' },
  { id: 'ink', label: 'Ink', hex: '#1a100a' },
  { id: 'warm-brown', label: 'Warm brown', hex: '#3d2c24' },
  { id: 'cream', label: 'Cream', hex: '#f5f0eb' },
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'gold', label: 'Gold accent', hex: '#c9a227' },
  { id: 'forest', label: 'Forest', hex: '#2d4a3e' },
  { id: 'midnight', label: 'Midnight', hex: '#1e2a44' },
  { id: 'plum', label: 'Plum', hex: '#4a2038' },
  { id: 'slate', label: 'Slate', hex: '#4a5568' },
]

export function coverPaletteHex(id: string): string | null {
  return COVER_BRAND_PALETTE.find((s) => s.id === id)?.hex ?? null
}
