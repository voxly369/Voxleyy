import { plainTextToChapterJson } from './booksApi.ts'
import type { ImportedChapter } from './importManuscript.ts'

export function renameImportedChapter(chapters: ImportedChapter[], index: number, title: string): ImportedChapter[] {
  return chapters.map((ch, i) => (i === index ? { ...ch, title: title.trim() || ch.title } : ch))
}

export function deleteImportedChapter(chapters: ImportedChapter[], index: number): ImportedChapter[] {
  if (index < 0 || index >= chapters.length) return chapters
  return chapters.filter((_, i) => i !== index)
}

export function reorderImportedChapters(chapters: ImportedChapter[], from: number, to: number): ImportedChapter[] {
  if (from === to || from < 0 || to < 0 || from >= chapters.length || to >= chapters.length) return chapters
  const next = [...chapters]
  const [moved] = next.splice(from, 1)
  if (!moved) return chapters
  next.splice(to, 0, moved)
  return next
}

export function mergeImportedChapterWithNext(chapters: ImportedChapter[], index: number): ImportedChapter[] {
  if (index < 0 || index >= chapters.length - 1) return chapters
  const current = chapters[index]
  const nextChapter = chapters[index + 1]
  if (!current || !nextChapter) return chapters
  const bodyText = `${current.bodyText}\n\n${nextChapter.title}\n${nextChapter.bodyText}`.trim()
  const merged: ImportedChapter = {
    title: current.title,
    bodyText,
    bodyJson: plainTextToChapterJson(bodyText),
  }
  return [...chapters.slice(0, index), merged, ...chapters.slice(index + 2)]
}

export function splitImportedChapter(chapters: ImportedChapter[], index: number): ImportedChapter[] {
  const chapter = chapters[index]
  if (!chapter) return chapters
  const paragraphs = chapter.bodyText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length < 2) {
    const midpoint = Math.floor(chapter.bodyText.length / 2)
    const splitAt = chapter.bodyText.indexOf(' ', midpoint)
    const at = splitAt > 0 ? splitAt : midpoint
    const first = chapter.bodyText.slice(0, at).trim()
    const second = chapter.bodyText.slice(at).trim()
    if (!first || !second) return chapters
    const partA: ImportedChapter = {
      title: chapter.title,
      bodyText: first,
      bodyJson: plainTextToChapterJson(first),
    }
    const partB: ImportedChapter = {
      title: `${chapter.title} (continued)`,
      bodyText: second,
      bodyJson: plainTextToChapterJson(second),
    }
    return [...chapters.slice(0, index), partA, partB, ...chapters.slice(index + 1)]
  }
  const half = Math.ceil(paragraphs.length / 2)
  const firstBody = paragraphs.slice(0, half).join('\n\n')
  const secondBody = paragraphs.slice(half).join('\n\n')
  const partA: ImportedChapter = {
    title: chapter.title,
    bodyText: firstBody,
    bodyJson: plainTextToChapterJson(firstBody),
  }
  const partB: ImportedChapter = {
    title: `${chapter.title} (continued)`,
    bodyText: secondBody,
    bodyJson: plainTextToChapterJson(secondBody),
  }
  return [...chapters.slice(0, index), partA, partB, ...chapters.slice(index + 1)]
}
