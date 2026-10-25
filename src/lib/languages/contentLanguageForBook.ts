/** Chapters inherit the book's declared language (SPEC section 5). */
export function contentLanguageForBook(bookLanguage: string | null | undefined, fallback = 'en'): string {
  const code = bookLanguage?.trim().toLowerCase()
  if (!code) return fallback
  return code
}
