/** Strip control chars and normalize whitespace for imported manuscripts. */
export function sanitizeManuscriptText(source: string): string {
  return source
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .trim()
}

export const MANUSCRIPT_MAX_CHARS = 2_000_000
export const MANUSCRIPT_MAX_CHAPTERS = 200

export function enforceManuscriptLimits(text: string, chapterCount: number): string | null {
  if (text.length > MANUSCRIPT_MAX_CHARS) {
    return `Manuscript is too long (max ${MANUSCRIPT_MAX_CHARS.toLocaleString()} characters).`
  }
  if (chapterCount > MANUSCRIPT_MAX_CHAPTERS) {
    return `Too many chapters detected (max ${MANUSCRIPT_MAX_CHAPTERS}).`
  }
  if (!text.trim()) {
    return 'No text found in this file.'
  }
  return null
}
