import { detectChapterBreaks, mergeShortChapters } from './chapterBreakDetection.ts'
import { plainTextToChapterJson } from './booksApi.ts'
import { enforceManuscriptLimits, sanitizeManuscriptText } from './manuscriptSanitize.ts'
import { extractPlainTextFromPdfDocument, mapPdfLoadError } from './pdfImport.ts'

export type ImportedChapter = {
  title: string
  bodyText: string
  bodyJson: ReturnType<typeof plainTextToChapterJson>
}

export async function importDocxFile(file: File): Promise<ImportedChapter[]> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return chaptersFromPlainText(result.value ?? '')
}

export async function importPdfFile(file: File): Promise<ImportedChapter[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString()
  const data = new Uint8Array(await file.arrayBuffer())
  try {
    const doc = await pdfjs.getDocument({ data }).promise
    const plain = await extractPlainTextFromPdfDocument(doc as import('./pdfImport.ts').PdfDocumentLike)
    return chaptersFromPlainText(plain)
  } catch (error) {
    throw mapPdfLoadError(error)
  }
}

export function chaptersFromPlainText(text: string): ImportedChapter[] {
  const clean = sanitizeManuscriptText(text)
  const detected = mergeShortChapters(detectChapterBreaks(clean))
  const limitError = enforceManuscriptLimits(clean, detected.length)
  if (limitError) throw new Error(limitError)
  return detected.map((chapter, index) => ({
    title: chapter.title.trim() || `Chapter ${index + 1}`,
    bodyText: chapter.body,
    bodyJson: plainTextToChapterJson(chapter.body),
  }))
}

export function importPlainTextFile(file: File): Promise<ImportedChapter[]> {
  return file.text().then(chaptersFromPlainText)
}
