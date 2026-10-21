export const PDF_NO_SELECTABLE_TEXT = 'This PDF has no selectable text'

export const PDF_CORRUPT_OR_PASSWORD =
  'This PDF could not be opened. It may be corrupt, password-protected, or not a valid PDF.'

export type PdfTextPage = {
  getTextContent: () => Promise<{ items: Array<{ str?: string } | Record<string, unknown>> }>
}

export type PdfDocumentLike = {
  numPages: number
  getPage: (page: number) => Promise<PdfTextPage>
}

export async function extractPlainTextFromPdfDocument(doc: PdfDocumentLike): Promise<string> {
  if (doc.numPages === 0) {
    throw new Error(PDF_NO_SELECTABLE_TEXT)
  }
  const parts: string[] = []
  for (let page = 1; page <= doc.numPages; page += 1) {
    const pageDoc = await doc.getPage(page)
    const content = await pageDoc.getTextContent()
    const line = content.items
      .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
      .join(' ')
      .trim()
    if (line) parts.push(line)
  }
  if (parts.length === 0) {
    throw new Error(PDF_NO_SELECTABLE_TEXT)
  }
  return parts.join('\n\n')
}

export function mapPdfLoadError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  if (message === PDF_NO_SELECTABLE_TEXT) {
    return new Error(PDF_NO_SELECTABLE_TEXT)
  }
  const lower = message.toLowerCase()
  if (
    lower.includes('password') ||
    lower.includes('encrypted') ||
    lower.includes('invalid pdf') ||
    lower.includes('corrupt') ||
    lower.includes('format error')
  ) {
    return new Error(PDF_CORRUPT_OR_PASSWORD)
  }
  return error instanceof Error ? error : new Error(PDF_CORRUPT_OR_PASSWORD)
}
