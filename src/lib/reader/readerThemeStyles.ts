import type { ReaderPreferences } from './readerPreferencesSchema.ts'

const TEXT_SIZE_STEPS = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-[1.375rem]'] as const
const MARGIN_STEPS = ['px-3', 'px-4', 'px-6', 'px-8', 'px-12'] as const

export function readerSurfaceClass(theme: ReaderPreferences['theme']): string {
  switch (theme) {
    case 'sepia':
      return 'bg-[#f4ecd8] text-[#3d2f1f]'
    case 'dark':
      return 'bg-[#1a1a1a] text-[#e8e8e8]'
    case 'black':
      return 'bg-black text-[#f0f0f0]'
    default:
      return 'bg-[#faf8f5] text-[#1a1a1a]'
  }
}

export function readerFontFamily(font: ReaderPreferences['font']): string {
  switch (font) {
    case 'lora':
      return 'font-lora'
    case 'inter':
      return 'font-sans'
    case 'opendyslexic':
      return 'font-opendyslexic'
    default:
      return 'font-serif'
  }
}

export function readerTypographyClasses(prefs: ReaderPreferences): string {
  const size = TEXT_SIZE_STEPS[prefs.textSizeStep] ?? TEXT_SIZE_STEPS[2]
  const margin = MARGIN_STEPS[prefs.marginStep] ?? MARGIN_STEPS[2]
  const justify = prefs.justify ? 'text-justify' : 'text-left'
  return `${size} ${margin} ${justify} leading-[var(--reader-line-height)]`
}

export function readerLineHeightValue(lineSpacing: number): string {
  return String(lineSpacing)
}
