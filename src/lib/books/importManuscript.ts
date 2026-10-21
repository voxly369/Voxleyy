import { detectChapterBreaks, mergeShortChapters } from './chapterBreakDetection.ts'
import { plainTextToChapterJson } from './booksApi.ts'
import { enforceManuscriptLimits, sanitizeManuscriptText } from './manuscriptSanitize.ts'

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
  const doc = await pdfjs.getDocument({ data }).promise
  const parts: string[] = []
  if (doc.numPages === 0) throw new Error('No text found in this file.')
  for (let page = 1; page <= doc.numPages; page += 1) {
    const pageDoc = await doc.getPage(page)
    const content = await pageDoc.getTextContent()
    const line = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    if (line) parts.push(line)
  }
  return chaptersFromPlainText(parts.join('\n\n'))
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
