import { z } from 'zod'

export const READER_PREFERENCES_MAX_BYTES = 2000

export const readerThemeSchema = z.enum(['paper', 'sepia', 'dark', 'black'])
export const readerFontSchema = z.enum(['fraunces', 'lora', 'inter', 'opendyslexic'])
export const readerModeSchema = z.enum(['scroll', 'page'])

export const readerPreferencesSchema = z
  .object({
    theme: readerThemeSchema.default('paper'),
    font: readerFontSchema.default('fraunces'),
    textSizeStep: z.number().int().min(0).max(4).default(2),
    lineSpacing: z.number().min(1).max(2.5).default(1.5),
    marginStep: z.number().int().min(0).max(4).default(2),
    justify: z.boolean().default(false),
    brightness: z.number().min(0.5).max(1.5).default(1),
    mode: readerModeSchema.default('scroll'),
  })
  .strip()

export type ReaderPreferences = z.infer<typeof readerPreferencesSchema>

export const defaultReaderPreferences: ReaderPreferences = readerPreferencesSchema.parse({})

export function parseReaderPreferences(raw: unknown): ReaderPreferences {
  const parsed = readerPreferencesSchema.safeParse(raw)
  if (parsed.success) return parsed.data
  return defaultReaderPreferences
}

export function readerPreferencesByteSize(prefs: ReaderPreferences): number {
  return new TextEncoder().encode(JSON.stringify(prefs)).byteLength
}

export function assertReaderPreferencesSize(prefs: ReaderPreferences): void {
  if (readerPreferencesByteSize(prefs) > READER_PREFERENCES_MAX_BYTES) {
    throw new Error('Reader preferences exceed size limit.')
  }
}
