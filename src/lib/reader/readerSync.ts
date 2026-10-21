import { createBookmark, deleteBookmark, listBookmarksForCreation } from './bookmarksApi.ts'
import {
  createHighlight,
  deleteHighlight,
  listHighlightsForCreation,
  updateHighlight,
} from './highlightsApi.ts'
import { mergeHighlightLists } from './highlightMerge.ts'
import type { ReaderBookmark, ReaderHighlight } from './highlightSchema.ts'
import {
  getOfflinePackage,
  saveOfflinePackage,
  type OfflineHighlightOp,
  type OfflineReadingPackage,
} from './offlineReadingStore.ts'
import { upsertPostProgress } from './progressApi.ts'
export async function syncOfflinePackage(creationId: string): Promise<void> {
  const pkg = await getOfflinePackage(creationId)
  if (!pkg) return

  for (const op of pkg.pendingHighlightOps) {
    if (op.kind === 'create') {
      await createHighlight({
        creationId,
        startParagraph: op.payload.startParagraph,
        startChar: op.payload.startChar,
        endParagraph: op.payload.endParagraph,
        endChar: op.payload.endChar,
        quote: op.payload.quote,
        colour: op.payload.colour,
        note: op.payload.note,
      })
    } else if (op.kind === 'update') {
      await updateHighlight(op.id, { colour: op.colour, note: op.note })
    } else if (op.kind === 'delete') {
      await deleteHighlight(op.id)
    }
  }

  for (const op of pkg.pendingBookmarkOps) {
    if (op.kind === 'create') {
      await createBookmark({
        creationId,
        paragraph: op.payload.paragraph,
        paragraphOffset: op.payload.paragraphOffset,
        label: op.payload.label,
      })
    } else if (op.kind === 'delete') {
      await deleteBookmark(op.id)
    }
  }

  if (pkg.progress) {
    await upsertPostProgress({
      creationId,
      percent: pkg.progress.percent,
      position: pkg.progress.paragraphIndex,
      positionOffset: pkg.progress.positionOffset,
    })
  }

  const [remoteHighlights, remoteBookmarks] = await Promise.all([
    listHighlightsForCreation(creationId),
    listBookmarksForCreation(creationId),
  ])
  const mergedHighlights = mergeHighlightLists(remoteHighlights, pkg.highlights)
  await saveOfflinePackage({
    ...pkg,
    highlights: mergedHighlights,
    bookmarks: remoteBookmarks,
    pendingHighlightOps: [],
    pendingBookmarkOps: [],
    progress: pkg.progress,
  })
}

export function queueHighlightOp(pkg: OfflineReadingPackage, op: OfflineHighlightOp): OfflineReadingPackage {
  return { ...pkg, pendingHighlightOps: [...pkg.pendingHighlightOps, op] }
}

export function applyLocalHighlightChange(
  highlights: ReaderHighlight[],
  op: OfflineHighlightOp,
): ReaderHighlight[] {
  if (op.kind === 'delete') return highlights.filter((h) => h.id !== op.id)
  if (op.kind === 'update') {
    return highlights.map((h) =>
      h.id === op.id
        ? {
            ...h,
            colour: op.colour ?? h.colour,
            note: op.note !== undefined ? op.note : h.note,
            updatedAt: new Date().toISOString(),
          }
        : h,
    )
  }
  const now = new Date().toISOString()
  return [
    ...highlights,
    {
      id: op.tempId,
      creationId: op.payload.creationId,
      startParagraph: op.payload.startParagraph,
      startChar: op.payload.startChar,
      endParagraph: op.payload.endParagraph,
      endChar: op.payload.endChar,
      quote: op.payload.quote,
      colour: op.payload.colour,
      note: op.payload.note ?? null,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function applyLocalBookmarkChange(
  bookmarks: ReaderBookmark[],
  op: { kind: 'create'; tempId: string; payload: Omit<ReaderBookmark, 'id' | 'createdAt'> } | { kind: 'delete'; id: string },
): ReaderBookmark[] {
  if (op.kind === 'delete') return bookmarks.filter((b) => b.id !== op.id)
  return [
    ...bookmarks,
    {
      id: op.tempId,
      creationId: op.payload.creationId,
      paragraph: op.payload.paragraph,
      paragraphOffset: op.payload.paragraphOffset,
      label: op.payload.label ?? null,
      createdAt: new Date().toISOString(),
    },
  ]
}
