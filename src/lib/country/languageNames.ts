export function languageNativeName(code: string): string {
  const trimmed = code.trim().toLowerCase()
  if (!trimmed) return code
  try {
    return new Intl.DisplayNames([trimmed], { type: 'language' }).of(trimmed) ?? trimmed
  } catch {
    return trimmed
  }
}
