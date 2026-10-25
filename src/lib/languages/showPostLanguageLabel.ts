export function shouldShowPostLanguageLabel(
  postLanguage: string | null | undefined,
  viewerLanguages: readonly string[],
): boolean {
  const code = postLanguage?.trim().toLowerCase()
  if (!code) return false
  const prefs = viewerLanguages.map((lang) => lang.trim().toLowerCase()).filter(Boolean)
  if (prefs.length === 0) return code !== 'en'
  return !prefs.includes(code)
}

export function languageFilterEmptyMessage(hasLanguageFilter: boolean, context: 'browse' | 'search'): string {
  if (!hasLanguageFilter) {
    return context === 'search'
      ? 'Nothing matched your search. Try different words.'
      : 'Try another mood, genre, or filter.'
  }
  return context === 'search'
    ? 'Nothing matched your search in those languages. Clear a language filter or try other words.'
    : 'Nothing matched those languages. Clear a language filter or try another mood or genre.'
}
