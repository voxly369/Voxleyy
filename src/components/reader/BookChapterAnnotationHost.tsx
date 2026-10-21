import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { reanchorHighlights, rangeFromSelection, type AnchoredHighlight } from '../../lib/reader/highlightAnchoring.ts'
import { quoteFromRange } from '../../lib/reader/highlightOffsets.ts'
import { paragraphCount } from '../../lib/reader/paragraphIndex.ts'
import type { HighlightColour, ReaderHighlight } from '../../lib/reader/highlightSchema.ts'
import {
  createChapterHighlight,
  deleteChapterHighlight,
  listHighlightsForChapter,
} from '../../lib/reader/chapterHighlightsApi.ts'
import { updateHighlight } from '../../lib/reader/highlightsApi.ts'
import { normalizeLookupWord } from '../../lib/reader/dictionaryWord.ts'
import { fetchDictionaryEntry, type DictionaryResult } from '../../lib/reader/dictionaryClient.ts'
import type { RichBodyDocument } from '../../lib/creations/richDocument.ts'
import type { StoredReadingPosition } from '../../lib/reader/readingPosition.ts'
import { HighlightActionBar } from './HighlightActionBar.tsx'
import { HighlightEditPanel } from './HighlightEditPanel.tsx'
import { DictionaryLookupSheet } from './DictionaryLookupSheet.tsx'

type BookChapterAnnotationHostProps = {
  chapterId: string
  chapterTitle: string
  bodyJson: RichBodyDocument | null
  bodyText: string
  bodyRootRef: RefObject<HTMLElement | null>
  getCurrentPosition: () => StoredReadingPosition
  children: (props: { highlights: AnchoredHighlight[]; onHighlightPress: (id: string) => void }) => React.ReactNode
}

export function BookChapterAnnotationHost({
  chapterId,
  chapterTitle,
  bodyJson,
  bodyText,
  bodyRootRef,
  children,
}: BookChapterAnnotationHostProps) {
  const [highlights, setHighlights] = useState<AnchoredHighlight[]>([])
  const [selectionRange, setSelectionRange] = useState<ReturnType<typeof rangeFromSelection>>(null)
  const [barPos, setBarPos] = useState({ top: 0, left: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState<ReaderHighlight | null>(null)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [lookupWord, setLookupWord] = useState('')
  const [lookupResult, setLookupResult] = useState<DictionaryResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const selectionRangeRef = useRef<ReturnType<typeof rangeFromSelection>>(null)

  const loadRemote = useCallback(async () => {
    const remote = await listHighlightsForChapter(chapterId)
    setHighlights(reanchorHighlights(remote, bodyJson, bodyText))
  }, [chapterId, bodyJson, bodyText])

  useEffect(() => {
    void loadRemote()
  }, [loadRemote])

  useEffect(() => {
    selectionRangeRef.current = selectionRange
  }, [selectionRange])

  function updateSelectionUi() {
    const root = bodyRootRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.isCollapsed) {
      setSelectionRange(null)
      return
    }
    const range = rangeFromSelection(root, selection, paragraphCount(bodyJson, bodyText))
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
  }, [bodyRootRef, bodyJson, bodyText])

  async function onPickColour(colour: HighlightColour) {
    const activeRange = selectionRangeRef.current ?? selectionRange
    if (!activeRange) return
    const quote = quoteFromRange(bodyJson, bodyText, activeRange)
    if (!quote) return
    window.getSelection()?.removeAllRanges()
    setSelectionRange(null)
    const created = await createChapterHighlight({
      chapterId,
      ...activeRange,
      quote,
      colour,
    })
    if (created.ok) {
      setHighlights((prev) => reanchorHighlights([...prev, created.highlight], bodyJson, bodyText))
    }
  }

  return (
    <>
      {children({
        highlights,
        onHighlightPress: (id) => {
          const hit = highlights.find((h) => h.id === id)
          if (!hit) return
          setActiveHighlight(hit)
          setEditOpen(true)
        },
      })}
      <HighlightActionBar
        open={Boolean(selectionRange)}
        top={barPos.top}
        left={barPos.left}
        canShareQuote={false}
        onColour={onPickColour}
        onAddNote={() => void onPickColour('yellow')}
        onCopy={() => {
          const text = window.getSelection()?.toString() ?? ''
          if (text) void navigator.clipboard.writeText(text)
          window.getSelection()?.removeAllRanges()
          setSelectionRange(null)
        }}
        onLookUp={() => {
          const word = normalizeLookupWord(window.getSelection()?.toString() ?? '')
          if (!word) return
          setLookupWord(word)
          setLookupOpen(true)
          setLookupLoading(true)
          void fetchDictionaryEntry(word).then((result) => {
            setLookupResult(result)
            setLookupLoading(false)
          })
          window.getSelection()?.removeAllRanges()
          setSelectionRange(null)
        }}
        onShareQuote={() => {}}
      />
      <HighlightEditPanel
        open={editOpen}
        highlight={activeHighlight}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => {
          if (!activeHighlight) return
          void updateHighlight(activeHighlight.id, patch).then((updated) => {
            if (updated.ok) {
              setHighlights((prev) =>
                prev.map((h) => (h.id === activeHighlight.id ? { ...updated.highlight, unmatched: h.unmatched } : h)),
              )
            }
            setEditOpen(false)
          })
        }}
        onDelete={() => {
          if (!activeHighlight) return
          void deleteChapterHighlight(activeHighlight.id).then(() => {
            setHighlights((prev) => prev.filter((h) => h.id !== activeHighlight.id))
            setEditOpen(false)
          })
        }}
      />
      <DictionaryLookupSheet
        open={lookupOpen}
        word={lookupWord}
        result={lookupResult}
        loading={lookupLoading}
        onClose={() => setLookupOpen(false)}
      />
      <span className="sr-only">{chapterTitle}</span>
    </>
  )
}
