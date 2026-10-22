/** Case-insensitive substring match, aligned with SQL `ilike '%word%'`. */
export function hiddenWordMatch(text: string, hiddenWords: readonly string[]): boolean {
  if (!text || hiddenWords.length === 0) return false
  const lower = text.toLowerCase()
  for (const word of hiddenWords) {
    const needle = word.trim().toLowerCase()
    if (!needle) continue
    if (lower.includes(needle)) return true
  }
  return false
}

export function textContainsHiddenWord(text: string, word: string): boolean {
  return hiddenWordMatch(text, [word])
}
