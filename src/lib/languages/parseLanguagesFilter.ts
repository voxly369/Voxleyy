import { KNOWN_LANGUAGE_CODES } from './languagesList.generated.ts'

const CODE_PATTERN = /^[a-z]{2,8}$/

export function parseLanguagesFilter(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const code = part.trim().toLowerCase()
    if (!CODE_PATTERN.test(code)) continue
    if (!KNOWN_LANGUAGE_CODES.has(code)) continue
    seen.add(code)
  }
  return [...seen].sort()
}

export function serializeLanguagesFilter(codes: readonly string[]): string {
  return [...new Set(codes.map((c) => c.trim().toLowerCase()).filter((c) => CODE_PATTERN.test(c)))].sort().join(',')
}
