import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { CreationDetail } from '../../lib/creations/types.ts'
import { createBookmark, deleteBookmarkAtPosition, listBookmarksForCreation } from '../../lib/reader/bookmarksApi.ts'
import { normalizeLookupWord } from '../../lib/reader/dictionaryWord.ts'
import { fetchDictionaryEntry, type DictionaryResult } from '../../lib/reader/dictionaryClient.ts'
import { reanchorHighlights, rangeFromSelection, type AnchoredHighlight } from '../../lib/reader/highlightAnchoring.ts'
import { quoteFromRange } from '../../lib/reader/highlightOffsets.ts'
import { paragraphCount } from '../../lib/reader/paragraphIndex.ts'
import {
  createHighlight,
  deleteHighlight,
  listHighlightsForCreation,
  updateHighlight,
} from '../../lib/reader/highlightsApi.ts'
import type { HighlightColour, ReaderBookmark, ReaderHighlight } from '../../lib/reader/highlightSchema.ts'
import { getOfflinePackage, saveOfflinePackage } from '../../lib/reader/offlineReadingStore.ts'
import { applyLocalBookmarkChange, applyLocalHighlightChange, queueHighlightOp, syncOfflinePackage } from '../../lib/reader/readerSync.ts'
import type { StoredReadingPosition } from '../../lib/reader/readingPosition.ts'
import { useOnlineStatus } from '../../lib/reader/useOnlineStatus.ts'
import { HighlightActionBar } from './HighlightActionBar.tsx'
import { HighlightEditPanel } from './HighlightEditPanel.tsx'
import { DictionaryLookupSheet } from './DictionaryLookupSheet.tsx'

type ReaderAnnotationHostProps = {
  work: CreationDetail
  bodyRootRef: RefObject<HTMLElement | null>
  offlineEnabled: boolean
  getCurrentPosition: () => StoredReadingPosition
  onHighlightsChange?: (highlights: AnchoredHighlight[]) => void
  onBookmarksChange?: (bookmarks: ReaderBookmark[]) => void
  onJumpToParagraph?: (paragraph: number, offset: number) => void
  children: (props: {
    highlights: AnchoredHighlight[]
    bookmarks: ReaderBookmark[]
    bookmarkParagraphs: number[]
    onHighlightPress: (id: string) => void
    offlineBanner: boolean
    toggleBookmark: () => void
    jumpToBookmark: (paragraph: number, offset: number) => void
  }) => React.ReactNode
}

export function ReaderAnnotationHost({
  work,
  bodyRootRef,
  offlineEnabled,
  getCurrentPosition,
  onHighlightsChange,
  onBookmarksChange,
  onJumpToParagraph,
  children,
}: ReaderAnnotationHostProps) {
  const online = useOnlineStatus()
  const [highlights, setHighlights] = useState<AnchoredHighlight[]>([])
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([])
  const [selectionRange, setSelectionRange] = useState<ReturnType<typeof rangeFromSelection>>(null)
  const [barPos, setBarPos] = useState({ top: 0, left: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState<ReaderHighlight | null>(null)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupWord, setLookupWord] = useState('')
  const [lookupResult, setLookupResult] = useState<DictionaryResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const selectionRangeRef = useRef<ReturnType<typeof rangeFromSelection>>(null)
  const loadSeqRef = useRef(0)

  useEffect(() => {
    selectionRangeRef.current = selectionRange
  }, [selectionRange])

  const loadRemote = useCallback(async () => {
    const seq = ++loadSeqRef.current
    const offlinePkg = offlineEnabled ? await getOfflinePackage(work.id) : null
    if (!online && offlinePkg) {
      const anchored = reanchorHighlights(offlinePkg.highlights, work.bodyJson, work.bodyText ?? '')
      if (seq !== loadSeqRef.current) return
      setHighlights(anchored)
      setBookmarks(offlinePkg.bookmarks)
      onHighlightsChange?.(anchored)
      onBookmarksChange?.(offlinePkg.bookmarks)
      return
    }
    const [remoteHighlights, remoteBookmarks] = await Promise.all([
      listHighlightsForCreation(work.id),
      listBookmarksForCreation(work.id),
    ])
    if (seq !== loadSeqRef.current) return
    const anchored = reanchorHighlights(remoteHighlights, work.bodyJson, work.bodyText ?? '')
    setHighlights(anchored)
    setBookmarks(remoteBookmarks)
    onHighlightsChange?.(anchored)
    onBookmarksChange?.(remoteBookmarks)
    if (online) void syncOfflinePackage(work.id)
  }, [work.id, work.bodyJson, work.bodyText, offlineEnabled, online, onHighlightsChange, onBookmarksChange])

  useEffect(() => {
    void loadRemote()
  }, [loadRemote])

  useEffect(() => {
    if (online) void syncOfflinePackage(work.id).then(() => loadRemote())
  }, [online, work.id, loadRemote])

  function updateSelectionUi() {
    const root = bodyRootRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.isCollapsed) {
      setSelectionRange(null)
      return
    }
    const range = rangeFromSelection(root, selection, paragraphCount(work.bodyJson, work.bodyText ?? ''))
    if (!range) {
      setSelectionRange(null)
      return
    }
    setSelectionRange(range)
    const rect = selection.getRangeAt(0).getBoundingClientRect()
    setBarPos({ top: Math.max(8, rect.top - 48), left: Math.min(window.innerWidth - 220, rect.left) })
  }

  useEffect(() => {
    const root = bodyRootRef.current
    if (!root) return
    const onSelectionChange = () => updateSelectionUi()
    document.addEventListener('selectionchange', onSelectionChange)
    root.addEventListener('mouseup', onSelectionChange)
    root.addEventListener('keyup', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      root.removeEventListener('mouseup', onSelectionChange)
      root.removeEventListener('keyup', onSelectionChange)
    }
  }, [bodyRootRef, work.bodyJson, work.bodyText])

  async function persistHighlightLocallyOrRemote(
    next: AnchoredHighlight[],
    op?: Parameters<typeof queueHighlightOp>[1],
  ) {
    setHighlights(next)
    onHighlightsChange?.(next)
    if (!offlineEnabled || !op) return
    const pkg = (await getOfflinePackage(work.id)) ?? null
    if (!pkg) return
    await saveOfflinePackage({
      ...pkg,
      highlights: next.map(({ unmatched: _u, ...rest }) => rest),
      pendingHighlightOps: [...pkg.pendingHighlightOps, op],
    })
  }

  async function persistBookmarksLocally(next: ReaderBookmark[], op: Parameters<typeof applyLocalBookmarkChange>[1]) {
    setBookmarks(next)
    onBookmarksChange?.(next)
    if (!offlineEnabled) return
    const pkg = await getOfflinePackage(work.id)
    if (!pkg) return
    await saveOfflinePackage({
      ...pkg,
      bookmarks: next,
      pendingBookmarkOps: [...pkg.pendingBookmarkOps, op],
    })
  }

  async function onPickColour(colour: HighlightColour) {
    const activeRange = selectionRangeRef.current ?? selectionRange
    if (!activeRange) return
    const quote = quoteFromRange(work.bodyJson, work.bodyText ?? '', activeRange)
    if (!quote) return
    window.getSelection()?.removeAllRanges()
    setSelectionRange(null)
    if (online) {
      const created = await createHighlight({
        creationId: work.id,
        ...activeRange,
        quote,
        colour,
      })
      if (created.ok) {
        const anchored = reanchorHighlights([...highlights, created.highlight], work.bodyJson, work.bodyText ?? '')
        setHighlights(anchored)
        onHighlightsChange?.(anchored)
      }
      return
    }
    const tempId = crypto.randomUUID()
    const op = {
      kind: 'create' as const,
      tempId,
      payload: {
        creationId: work.id,
        ...activeRange,
        quote,
        colour,
        note: null,
      },
    }
    const next = applyLocalHighlightChange(highlights, op)
    const anchored = reanchorHighlights(next, work.bodyJson, work.bodyText ?? '')
    await persistHighlightLocallyOrRemote(anchored, op)
  }

  function selectedWord(): string | null {
    const selection = window.getSelection()?.toString() ?? ''
    return normalizeLookupWord(selection)
  }

  async function onLookUp() {
    const word = selectedWord()
    if (!word) return
    setLookupWord(word)
    setLookupOpen(true)
    setLookupLoading(true)
    const result = await fetchDictionaryEntry(word)
    setLookupResult(result)
    setLookupLoading(false)
    window.getSelection()?.removeAllRanges()
    setSelectionRange(null)
  }

  function onCopy() {
    const text = window.getSelection()?.toString() ?? ''
    if (text) void navigator.clipboard.writeText(text)
    window.getSelection()?.removeAllRanges()
    setSelectionRange(null)
  }

  function onShareQuote() {
    const text = window.getSelection()?.toString() ?? ''
    if (!text) return
    const formatted = `“${text.trim()}” — ${work.title?.trim() || 'Untitled'}`
    void navigator.clipboard.writeText(formatted)
    window.getSelection()?.removeAllRanges()
    setSelectionRange(null)
  }

  async function toggleBookmarkAtCurrent() {
    const measured = getCurrentPosition()
    const existing = bookmarks.find((b) => b.paragraph === measured.paragraphIndex)
    if (existing) {
      if (online) await deleteBookmarkAtPosition(work.id, measured.paragraphIndex)
      const next = bookmarks.filter((b) => b.id !== existing.id)
      if (!online && offlineEnabled) {
        await persistBookmarksLocally(next, { kind: 'delete', id: existing.id })
      } else {
        setBookmarks(next)
        onBookmarksChange?.(next)
      }
      return
    }
    if (online) {
      const created = await createBookmark({
        creationId: work.id,
        paragraph: measured.paragraphIndex,
        paragraphOffset: measured.positionOffset,
      })
      if (created.ok) {
        const next = [...bookmarks, created.bookmark]
        setBookmarks(next)
        onBookmarksChange?.(next)
      }
      return
    }
    const tempId = crypto.randomUUID()
    const op = {
      kind: 'create' as const,
      tempId,
      payload: {
        creationId: work.id,
        paragraph: measured.paragraphIndex,
        paragraphOffset: measured.positionOffset,
        label: null,
      },
    }
    const next = applyLocalBookmarkChange(bookmarks, op)
    await persistBookmarksLocally(next, op)
  }

  return (
    <>
      {children({
        highlights,
        bookmarks,
        bookmarkParagraphs: bookmarks.map((b) => b.paragraph),
        onHighlightPress: (id) => {
          const hit = highlights.find((h) => h.id === id)
          if (!hit) return
          setActiveHighlight(hit)
          setEditOpen(true)
        },
        offlineBanner: !online,
        toggleBookmark: () => void toggleBookmarkAtCurrent(),
        jumpToBookmark: (paragraph, offset) => onJumpToParagraph?.(paragraph, offset),
      })}
      <HighlightActionBar
        open={Boolean(selectionRange)}
        top={barPos.top}
        left={barPos.left}
        canShareQuote={work.audience === 'public'}
        onColour={onPickColour}
        onAddNote={() => void onPickColour('yellow').then(() => {
          const latest = highlights[highlights.length - 1]
          if (latest) {
            setActiveHighlight(latest)
            setEditOpen(true)
          }
        })}
        onCopy={onCopy}
        onLookUp={() => void onLookUp()}
        onShareQuote={onShareQuote}
      />
      <HighlightEditPanel
        open={editOpen}
        highlight={activeHighlight}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => {
          if (!activeHighlight) return
          void (async () => {
            if (online) {
              const updated = await updateHighlight(activeHighlight.id, patch)
              if (updated.ok) {
                const next = highlights.map((h) => (h.id === activeHighlight.id ? { ...updated.highlight, unmatched: h.unmatched } : h))
                setHighlights(next)
                onHighlightsChange?.(next)
              }
            } else {
              const op = { kind: 'update' as const, id: activeHighlight.id, ...patch }
              const next = applyLocalHighlightChange(highlights, op)
              await persistHighlightLocallyOrRemote(
                reanchorHighlights(next, work.bodyJson, work.bodyText ?? ''),
                op,
              )
            }
            setEditOpen(false)
          })()
        }}
        onDelete={() => {
          if (!activeHighlight) return
          void (async () => {
            if (online) {
              await deleteHighlight(activeHighlight.id)
              setHighlights((prev) => {
                const next = prev.filter((h) => h.id !== activeHighlight.id)
                onHighlightsChange?.(next)
                return next
              })
            } else {
              const op = { kind: 'delete' as const, id: activeHighlight.id }
              const next = applyLocalHighlightChange(highlights, op)
              await persistHighlightLocallyOrRemote(
                reanchorHighlights(next, work.bodyJson, work.bodyText ?? ''),
                op,
              )
            }
            setEditOpen(false)
          })()
        }}
      />
      <DictionaryLookupSheet
        open={lookupOpen}
        word={lookupWord}
        result={lookupResult}
        loading={lookupLoading}
        onClose={() => setLookupOpen(false)}
      />
    </>
  )
}
