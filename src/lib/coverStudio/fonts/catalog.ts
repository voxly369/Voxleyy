export type CoverFontCategory =
  | 'brand'
  | 'literary_serif'
  | 'modern_sans'
  | 'display'
  | 'script'
  | 'accessibility'

export type CoverFontEntry = {
  id: string
  label: string
  category: CoverFontCategory
  /** CSS font-family stack used on canvas and in the editor. */
  family: string
  weights: number[]
  supportsItalic: boolean
}

export const COVER_FONT_CATEGORIES: { id: CoverFontCategory; label: string }[] = [
  { id: 'brand', label: 'Voxly brand' },
  { id: 'literary_serif', label: 'Literary serif' },
  { id: 'modern_sans', label: 'Modern sans' },
  { id: 'display', label: 'Display' },
  { id: 'script', label: 'Script & handwriting' },
  { id: 'accessibility', label: 'Accessibility' },
]

export const COVER_FONT_CATALOG: CoverFontEntry[] = [
  { id: 'fraunces', label: 'Fraunces', category: 'brand', family: '"Fraunces Variable", Fraunces, serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'lora', label: 'Lora', category: 'brand', family: 'Lora, serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'inter', label: 'Inter', category: 'brand', family: '"Inter Variable", Inter, sans-serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'libre-baskerville', label: 'Libre Baskerville', category: 'literary_serif', family: '"Libre Baskerville", serif', weights: [400, 700], supportsItalic: true },
  { id: 'merriweather', label: 'Merriweather', category: 'literary_serif', family: 'Merriweather, serif', weights: [400, 700], supportsItalic: true },
  { id: 'cormorant', label: 'Cormorant Garamond', category: 'literary_serif', family: '"Cormorant Garamond", serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'playfair', label: 'Playfair Display', category: 'literary_serif', family: '"Playfair Display", serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'montserrat', label: 'Montserrat', category: 'modern_sans', family: 'Montserrat, sans-serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'raleway', label: 'Raleway', category: 'modern_sans', family: 'Raleway, sans-serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'josefin-sans', label: 'Josefin Sans', category: 'modern_sans', family: '"Josefin Sans", sans-serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'work-sans', label: 'Work Sans', category: 'modern_sans', family: '"Work Sans", sans-serif', weights: [400, 500, 600, 700], supportsItalic: true },
  { id: 'cinzel', label: 'Cinzel', category: 'display', family: 'Cinzel, serif', weights: [400, 500, 600, 700], supportsItalic: false },
  { id: 'oswald', label: 'Oswald', category: 'display', family: 'Oswald, sans-serif', weights: [400, 500, 600, 700], supportsItalic: false },
  { id: 'bebas-neue', label: 'Bebas Neue', category: 'display', family: '"Bebas Neue", sans-serif', weights: [400], supportsItalic: false },
  { id: 'dancing-script', label: 'Dancing Script', category: 'script', family: '"Dancing Script", cursive', weights: [400, 700], supportsItalic: false },
  { id: 'great-vibes', label: 'Great Vibes', category: 'script', family: '"Great Vibes", cursive', weights: [400], supportsItalic: false },
  { id: 'pacifico', label: 'Pacifico', category: 'script', family: 'Pacifico, cursive', weights: [400], supportsItalic: false },
  { id: 'caveat', label: 'Caveat', category: 'script', family: 'Caveat, cursive', weights: [400, 500, 600, 700], supportsItalic: false },
  { id: 'opendyslexic', label: 'OpenDyslexic', category: 'accessibility', family: 'OpenDyslexic, sans-serif', weights: [400, 700], supportsItalic: false },
]

const loaders: Record<string, () => Promise<unknown>> = {
  fraunces: () => import('@fontsource-variable/fraunces'),
  lora: () => Promise.all([import('@fontsource/lora/400.css'), import('@fontsource/lora/700.css')]),
  inter: () => import('@fontsource-variable/inter'),
  'libre-baskerville': () =>
    Promise.all([import('@fontsource/libre-baskerville/400.css'), import('@fontsource/libre-baskerville/700.css')]),
  merriweather: () =>
    Promise.all([import('@fontsource/merriweather/400.css'), import('@fontsource/merriweather/700.css')]),
  cormorant: () =>
    Promise.all([
      import('@fontsource/cormorant-garamond/400.css'),
      import('@fontsource/cormorant-garamond/700.css'),
    ]),
  playfair: () =>
    Promise.all([import('@fontsource/playfair-display/400.css'), import('@fontsource/playfair-display/700.css')]),
  montserrat: () =>
    Promise.all([import('@fontsource/montserrat/400.css'), import('@fontsource/montserrat/700.css')]),
  raleway: () => Promise.all([import('@fontsource/raleway/400.css'), import('@fontsource/raleway/700.css')]),
  'josefin-sans': () =>
    Promise.all([import('@fontsource/josefin-sans/400.css'), import('@fontsource/josefin-sans/700.css')]),
  'work-sans': () => Promise.all([import('@fontsource/work-sans/400.css'), import('@fontsource/work-sans/700.css')]),
  cinzel: () => Promise.all([import('@fontsource/cinzel/400.css'), import('@fontsource/cinzel/700.css')]),
  oswald: () => Promise.all([import('@fontsource/oswald/400.css'), import('@fontsource/oswald/700.css')]),
  'bebas-neue': () => import('@fontsource/bebas-neue/400.css'),
  'dancing-script': () =>
    Promise.all([import('@fontsource/dancing-script/400.css'), import('@fontsource/dancing-script/700.css')]),
  'great-vibes': () => import('@fontsource/great-vibes/400.css'),
  pacifico: () => import('@fontsource/pacifico/400.css'),
  caveat: () => Promise.all([import('@fontsource/caveat/400.css'), import('@fontsource/caveat/700.css')]),
  opendyslexic: () =>
    Promise.all([import('@fontsource/opendyslexic/400.css'), import('@fontsource/opendyslexic/700.css')]),
}

const loaded = new Set<string>()

export function coverFontById(id: string): CoverFontEntry | undefined {
  return COVER_FONT_CATALOG.find((f) => f.id === id)
}

export function coverFontByFamily(family: string): CoverFontEntry | undefined {
  return COVER_FONT_CATALOG.find((f) => f.label === family || f.family.includes(family))
}

export function fontsInCategory(category: CoverFontCategory): CoverFontEntry[] {
  return COVER_FONT_CATALOG.filter((f) => f.category === category)
}

/** Lazy-load woff2 assets for a catalog font id (safe to call repeatedly). */
export async function ensureCoverFontLoaded(fontId: string): Promise<void> {
  if (loaded.has(fontId)) return
  const loader = loaders[fontId]
  if (!loader) return
  await loader()
  loaded.add(fontId)
}

/** Resolve a design `fontFamily` string to a catalog entry and load assets. */
export async function ensureCoverFontFamilyLoaded(fontFamily: string): Promise<CoverFontEntry | null> {
  const entry =
    COVER_FONT_CATALOG.find((f) => f.label === fontFamily) ??
    COVER_FONT_CATALOG.find((f) => fontFamily.startsWith(f.label))
  if (!entry) return null
  await ensureCoverFontLoaded(entry.id)
  return entry
}

export async function ensureDesignFontsLoaded(fontFamilies: string[]): Promise<void> {
  const ids = new Set<string>()
  for (const family of fontFamilies) {
    const entry = await ensureCoverFontFamilyLoaded(family)
    if (entry) ids.add(entry.id)
  }
  await Promise.all([...ids].map((id) => ensureCoverFontLoaded(id)))
}
