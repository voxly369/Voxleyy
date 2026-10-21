import { createChapterHighlight } from './chapterHighlightsApi.ts'
import type { HighlightColour } from './highlightSchema.ts'

const STORAGE_PREFIX = 'voxly-chapter-highlight-queue:'

export type PendingChapterHighlightCreate = {
  kind: 'create'
  tempId: string
  chapterId: string
  startParagraph: number
  startChar: number
  endParagraph: number
  endChar: number
  quote: string
  colour: HighlightColour
}

function storageKey(chapterId: string): string {
  return `${STORAGE_PREFIX}${chapterId}`
}

export function loadPendingChapterHighlightOps(chapterId: string): PendingChapterHighlightCreate[] {
  try {
    const raw = localStorage.getItem(storageKey(chapterId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as PendingChapterHighlightCreate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function savePendingChapterHighlightOps(chapterId: string, ops: PendingChapterHighlightCreate[]): void {
  if (ops.length === 0) localStorage.removeItem(storageKey(chapterId))
  else localStorage.setItem(storageKey(chapterId), JSON.stringify(ops))
}

export function queueChapterHighlightCreate(
  chapterId: string,
  input: Omit<PendingChapterHighlightCreate, 'kind' | 'tempId' | 'chapterId'>,
): PendingChapterHighlightCreate {
  const op: PendingChapterHighlightCreate = {
    kind: 'create',
    tempId: crypto.randomUUID(),
    chapterId,
    ...input,
  }
  const pending = loadPendingChapterHighlightOps(chapterId)
  pending.push(op)
  savePendingChapterHighlightOps(chapterId, pending)
  return op
}

export async function syncPendingChapterHighlights(chapterId: string): Promise<void> {
  const pending = loadPendingChapterHighlightOps(chapterId)
  if (pending.length === 0) return
  for (const op of pending) {
    await createChapterHighlight({
      chapterId: op.chapterId,
      startParagraph: op.startParagraph,
      startChar: op.startChar,
      endParagraph: op.endParagraph,
      endChar: op.endChar,
      quote: op.quote,
      colour: op.colour,
    })
  }
  savePendingChapterHighlightOps(chapterId, [])
}
