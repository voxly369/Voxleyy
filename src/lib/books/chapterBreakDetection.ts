export type DetectedChapter = {
  title: string
  body: string
  lineIndex: number
}

const CHAPTER_HEADING =
  /^(?:chapter|part|book|section|prologue|epilogue)\s+(?:[\divxlcdm]+|[a-z]+|\d+(?:\.\d+)*)[\s:.\-–—]*(.+)?$/i

const NUMBERED_HEADING = /^(\d+)[.)]\s+(.{2,120})$/

const ALL_CAPS_HEADING = /^[A-Z0-9][A-Z0-9\s'’\-–—:]{2,80}$/

function isLikelyChapterHeading(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3 || trimmed.length > 150) return false
  if (CHAPTER_HEADING.test(trimmed)) return true
  if (NUMBERED_HEADING.test(trimmed)) return true
  if (ALL_CAPS_HEADING.test(trimmed) && trimmed.includes(' ')) return true
  return false
}

function titleFromHeading(line: string): string {
  const trimmed = line.trim()
  const numbered = trimmed.match(NUMBERED_HEADING)
  if (numbered) return `${numbered[1]}. ${numbered[2]?.trim() ?? ''}`.trim()
  return trimmed
}

/** Split plain manuscript text into chapter-sized chunks using heading heuristics. */
export function detectChapterBreaks(source: string): DetectedChapter[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const chapters: DetectedChapter[] = []
  let currentTitle = 'Chapter 1'
  let currentBody: string[] = []
  let titleLine = 0
  let seenHeading = false

  function flush() {
    const body = currentBody.join('\n').trim()
    if (!seenHeading && chapters.length === 0 && !body) return
    chapters.push({ title: currentTitle, body, lineIndex: titleLine })
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (isLikelyChapterHeading(line)) {
      if (seenHeading || currentBody.some((l) => l.trim())) flush()
      seenHeading = true
      currentTitle = titleFromHeading(line)
      titleLine = i
      currentBody = []
      continue
    }
    currentBody.push(line)
  }

  flush()

  if (chapters.length === 0) {
    const body = source.trim()
    if (body) chapters.push({ title: 'Chapter 1', body, lineIndex: 0 })
  }

  return chapters
}

export function mergeShortChapters(chapters: DetectedChapter[], minWords = 40): DetectedChapter[] {
  if (chapters.length <= 1) return chapters
  const merged: DetectedChapter[] = []
  for (const chapter of chapters) {
    const words = chapter.body.split(/\s+/).filter(Boolean).length
    const prev = merged[merged.length - 1]
    if (prev && words < minWords) {
      prev.body = `${prev.body}\n\n${chapter.title}\n${chapter.body}`.trim()
      continue
    }
    merged.push({ ...chapter })
  }
  return merged
}
