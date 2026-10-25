import { KNOWN_LANGUAGE_CODES } from './languagesList.generated.ts'

export const DEFAULT_CONTENT_LANGUAGE = 'en'

export function resolveDefaultContentLanguage(preferred: readonly string[] | null | undefined): string {
  if (!preferred?.length) return DEFAULT_CONTENT_LANGUAGE
  for (const code of preferred) {
    const normalized = code.trim().toLowerCase()
    if (KNOWN_LANGUAGE_CODES.has(normalized)) return normalized
  }
  return DEFAULT_CONTENT_LANGUAGE
}
