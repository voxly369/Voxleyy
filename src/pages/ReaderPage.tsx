import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type TouchEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RichTextView } from '../components/creations/RichTextView.tsx'
import { ReaderAnnotationHost } from '../components/reader/ReaderAnnotationHost.tsx'
import { ReaderSettingsSheet } from '../components/reader/ReaderSettingsSheet.tsx'
import { ReaderTableOfContents } from '../components/reader/ReaderTableOfContents.tsx'
import { getCreationById } from '../lib/creations/api.ts'
import type { CreationDetail } from '../lib/creations/types.ts'
import { bodyTextFromJson } from '../lib/creations/bodyDocument.ts'
import { countWords, estimatedMinutesRemaining, formatMinutesLeft } from '../lib/reader/estimatedTime.ts'
import { isReaderEligibleType } from '../lib/reader/readerEligible.ts'
import { upsertPostProgress, fetchPostProgress } from '../lib/reader/progressApi.ts'
import {
  hydrateReaderPreferencesFromAccount,
  loadReaderPreferences,
  saveReaderPreferencesLocal,
  syncReaderPreferencesToAccount,
} from '../lib/reader/readerPreferencesStore.ts'
import type { ReaderPreferences } from '../lib/reader/readerPreferencesSchema.ts'
import {
  readerFontFamily,
  readerLineHeightValue,
  readerSurfaceClass,
  readerTypographyClasses,
} from '../lib/reader/readerThemeStyles.ts'
import { tableOfContentsFromBody } from '../lib/reader/toc.ts'
import { shouldSaveProgress } from '../lib/reader/throttleProgress.ts'
import { clampPageIndex, columnPageCount, pagesRemaining } from '../lib/reader/pagingMath.ts'
import { paragraphCount, readerParagraphIndexFromBlockIndex } from '../lib/reader/paragraphIndex.ts'
import {
  focusReaderHeading,
  measureScrollReadingPosition,
  pageIndexForParagraph,
  paragraphElement,
  scrollToReadingPosition,
  type StoredReadingPosition,
} from '../lib/reader/readingPosition.ts'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import type { ReaderBookmark } from '../lib/reader/highlightSchema.ts'
import type { AnchoredHighlight } from '../lib/reader/highlightAnchoring.ts'
import {
  creationDetailFromOfflinePackage,
  disableOfflineReadingForCreation,
  enableOfflineReadingForWork,
  isCreationOfflineSaved,
  updateOfflineReadingProgress,
} from '../lib/reader/offlineReadingActions.ts'
import { getOfflinePackage } from '../lib/reader/offlineReadingStore.ts'
import { useOnlineStatus } from '../lib/reader/useOnlineStatus.ts'
import { useToast } from '../lib/shell/useToast.ts'

const SWIPE_THRESHOLD_PX = 48

export default function ReaderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [work, setWork] = useState<CreationDetail | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [percent, setPercent] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageWidth, setPageWidth] = useState(0)
  const [layoutTick, setLayoutTick] = useState(0)
  const lastScrollY = useRef(0)
  const lastSaveAt = useRef<number | null>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const pageViewportRef = useRef<HTMLDivElement | null>(null)
  const pageTrackRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const pendingRestore = useRef<StoredReadingPosition | null>(null)
  const readingAnchor = useRef<StoredReadingPosition>({ paragraphIndex: 0, positionOffset: 0, percent: 0 })
  const touchStartX = useRef<number | null>(null)
  const restoredOnce = useRef(false)
  const online = useOnlineStatus()
  const { showToast } = useToast()
  const [offlineSaved, setOfflineSaved] = useState(false)
  const [offlineBusy, setOfflineBusy] = useState(false)
  const [annotationHighlights, setAnnotationHighlights] = useState<AnchoredHighlight[]>([])
  const [annotationBookmarks, setAnnotationBookmarks] = useState<ReaderBookmark[]>([])
  const [currentParagraph, setCurrentParagraph] = useState(0)
  const openHighlightRef = useRef<(id: string) => void>(() => {})
  const workRef = useRef<CreationDetail | null>(null)
  const lastLoadedIdRef = useRef<string | null>(null)

  useEffect(() => {
    workRef.current = work
  }, [work])

  const title = work?.title?.trim() || 'Reading'
  useDocumentTitle(title)

  useEffect(() => {
    void hydrateReaderPreferencesFromAccount().then(setPrefs)
  }, [])

  useEffect(() => {
    let active = true
    const idChanged = lastLoadedIdRef.current !== id
    if (idChanged) {
      restoredOnce.current = false
      pendingRestore.current = null
      lastLoadedIdRef.current = id
    }

    void (async () => {
      if (idChanged) {
        setProblem(null)
        setWork(null)
      }

      if (!online) {
        const offlinePkg = await getOfflinePackage(id)
        if (offlinePkg) {
          if (active) {
            setWork(creationDetailFromOfflinePackage(offlinePkg))
            setOfflineSaved(true)
            if (offlinePkg.progress && !pendingRestore.current) {
              pendingRestore.current = offlinePkg.progress
              readingAnchor.current = offlinePkg.progress
              setPercent(offlinePkg.progress.percent)
            }
          }
          return
        }
        if (!idChanged && workRef.current?.id === id) return
        if (active) setProblem('You are offline and this post is not saved on this device.')
        return
      }

      if (!idChanged && workRef.current?.id === id) {
        const savedOffline = await isCreationOfflineSaved(id)
        if (active) setOfflineSaved(savedOffline)
        return
      }

      const result = await getCreationById(id)
      if (!active) return
      if (!result.ok) {
        setProblem(result.error.message)
        return
      }
      if (!isReaderEligibleType(result.data.type)) {
        setProblem('This work opens in the standard post view.')
        return
      }
      setWork(result.data)
      const saved = await fetchPostProgress(id)
      if (saved && !saved.completed) {
        pendingRestore.current = {
          paragraphIndex: saved.position,
          positionOffset: saved.positionOffset,
          percent: saved.percent,
        }
        readingAnchor.current = pendingRestore.current
        setPercent(saved.percent)
      }
      const savedOffline = await isCreationOfflineSaved(id)
      if (active) setOfflineSaved(savedOffline)
    })()
    return () => {
      active = false
    }
  }, [id, online])

  const persistProgress = useCallback(
    (position: StoredReadingPosition) => {
      const now = Date.now()
      if (!shouldSaveProgress(lastSaveAt.current, now)) return
      lastSaveAt.current = now
      readingAnchor.current = position
      setCurrentParagraph(position.paragraphIndex)
      setPercent(position.percent)
      void upsertPostProgress({
        creationId: id,
        percent: position.percent,
        position: position.paragraphIndex,
        positionOffset: position.positionOffset,
      })
      if (offlineSaved) void updateOfflineReadingProgress(id, position)
    },
    [id, offlineSaved],
  )

  const flushProgress = useCallback(() => {
    if (prefs.mode === 'scroll') {
      const el = scrollRef.current
      if (!el) return
      const measured = measureScrollReadingPosition(el)
      if (!measured) return
      void upsertPostProgress({
        creationId: id,
        percent: measured.percent,
        position: measured.paragraphIndex,
        positionOffset: measured.positionOffset,
      })
      readingAnchor.current = measured
      setPercent(measured.percent)
      return
    }
    void upsertPostProgress({
      creationId: id,
      percent: readingAnchor.current.percent,
      position: readingAnchor.current.paragraphIndex,
      positionOffset: readingAnchor.current.positionOffset,
    })
  }, [id, prefs.mode])

  useEffect(() => {
    document.addEventListener('visibilitychange', flushProgress)
    return () => {
      flushProgress()
      document.removeEventListener('visibilitychange', flushProgress)
    }
  }, [flushProgress])

  function onPrefsChange(next: ReaderPreferences) {
    const saved = saveReaderPreferencesLocal(next)
    setPrefs(saved)
    void syncReaderPreferencesToAccount(saved)
  }

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const y = el.scrollTop
    setToolbarVisible(y < lastScrollY.current || y < 24)
    lastScrollY.current = y
    const measured = measureScrollReadingPosition(el)
    if (!measured) return
    setPercent(measured.percent)
    setCurrentParagraph(measured.paragraphIndex)
    persistProgress(measured)
  }

  const recomputePageLayout = useCallback(() => {
    const viewport = pageViewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    const width = viewport.clientWidth
    setPageWidth(width)
    const pages = columnPageCount(content.scrollWidth, width)
    setTotalPages(pages)
    const anchor = readingAnchor.current
    const paragraph = paragraphElement(content, anchor.paragraphIndex)
    const nextPage = paragraph ? pageIndexForParagraph(paragraph, width, anchor.positionOffset) : 0
    setPageIndex(clampPageIndex(nextPage, pages))
    setLayoutTick((n) => n + 1)
  }, [])

  useLayoutEffect(() => {
    if (prefs.mode !== 'page' || !work) return
    void document.fonts.ready.then(() => {
      recomputePageLayout()
    })
  }, [
    prefs.mode,
    work,
    prefs.textSizeStep,
    prefs.lineSpacing,
    prefs.marginStep,
    prefs.font,
    prefs.justify,
    recomputePageLayout,
  ])

  useEffect(() => {
    if (prefs.mode !== 'page') return
    const viewport = pageViewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(() => recomputePageLayout())
    observer.observe(viewport)
    const onOrientation = () => recomputePageLayout()
    window.addEventListener('orientationchange', onOrientation)
    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', onOrientation)
    }
  }, [prefs.mode, recomputePageLayout])

  const applyPendingRestore = useCallback(() => {
    if (restoredOnce.current || !pendingRestore.current) return
    const target = pendingRestore.current
    if (prefs.mode === 'scroll') {
      const el = scrollRef.current
      if (!el) return
      scrollToReadingPosition(el, target.paragraphIndex, target.positionOffset)
      restoredOnce.current = true
      pendingRestore.current = null
      const measured = measureScrollReadingPosition(el)
      if (measured) setPercent(measured.percent)
      return
    }
    const content = contentRef.current
    const viewport = pageViewportRef.current
    if (!content || !viewport || pageWidth <= 0) return
    const paragraph = paragraphElement(content, target.paragraphIndex)
    if (!paragraph) return
    const page = pageIndexForParagraph(paragraph, pageWidth, target.positionOffset)
    setPageIndex(clampPageIndex(page, totalPages))
    restoredOnce.current = true
    pendingRestore.current = null
  }, [prefs.mode, pageWidth, totalPages])

  useLayoutEffect(() => {
    applyPendingRestore()
  }, [applyPendingRestore, layoutTick, work, prefs.mode])

  function turnPage(delta: number) {
    setPageIndex((prev) => {
      const next = clampPageIndex(prev + delta, totalPages)
      readingAnchor.current = { ...readingAnchor.current, percent }
      return next
    })
  }

  useEffect(() => {
    if (prefs.mode !== 'page') return
    const content = contentRef.current
    if (!content || pageWidth <= 0) return
    const paragraphs = content.querySelectorAll('[data-reader-paragraph-index]')
    if (paragraphs.length === 0) return
    let best: HTMLElement | null = null
    let bestOverlap = 0
    const pageLeft = pageIndex * pageWidth
    const pageRight = pageLeft + pageWidth
    for (const node of paragraphs) {
      if (!(node instanceof HTMLElement)) continue
      const left = node.offsetLeft
      const right = left + node.offsetWidth
      const overlap = Math.min(right, pageRight) - Math.max(left, pageLeft)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        best = node
      }
    }
    if (!best) return
    const paragraphIndex = Number(best.dataset.readerParagraphIndex ?? 0)
    const positionOffset = readingAnchor.current.positionOffset
    const nextPercent = Math.round(((paragraphIndex + 1) / paragraphs.length) * 100)
    readingAnchor.current = {
      paragraphIndex,
      positionOffset,
      percent: nextPercent,
    }
    setCurrentParagraph(paragraphIndex)
    setPercent(nextPercent)
    persistProgress(readingAnchor.current)
  }, [pageIndex, pageWidth, prefs.mode, persistProgress])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (settingsOpen || tocOpen) return
      if (prefs.mode === 'page') {
        if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
          event.preventDefault()
          turnPage(1)
        }
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
          event.preventDefault()
          turnPage(-1)
        }
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onPageTap(event: MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - bounds.left
    if (x < bounds.width * 0.3) turnPage(-1)
    else if (x > bounds.width * 0.7) turnPage(1)
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current
    const end = event.changedTouches[0]?.clientX
    touchStartX.current = null
    if (start == null || end == null) return
    const delta = end - start
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    turnPage(delta < 0 ? 1 : -1)
  }

  const jumpToBookmark = useCallback(
    (paragraphIndex: number, positionOffset: number) => {
      const totalParas = work ? paragraphCount(work.bodyJson, work.bodyText ?? '') : 0
      const nextPercent =
        totalParas > 0 ? Math.round(((paragraphIndex + 1) / totalParas) * 100) : readingAnchor.current.percent
      readingAnchor.current = {
        paragraphIndex,
        positionOffset,
        percent: nextPercent,
      }
      setCurrentParagraph(paragraphIndex)
      setPercent(nextPercent)
      if (prefs.mode === 'scroll') {
        requestAnimationFrame(() => {
          const el = scrollRef.current
          if (el) scrollToReadingPosition(el, paragraphIndex, positionOffset)
        })
        return
      }
      requestAnimationFrame(() => {
        recomputePageLayout()
        const content = contentRef.current
        if (!content || pageWidth <= 0) return
        const paragraph = paragraphElement(content, paragraphIndex)
        if (!paragraph) return
        const page = pageIndexForParagraph(paragraph, pageWidth, positionOffset)
        setPageIndex(clampPageIndex(page, totalPages))
      })
    },
    [prefs.mode, pageWidth, totalPages, recomputePageLayout, work],
  )

  function navigateToToc(blockIndex: number) {
    if (!work) return
    const paragraphIndex = readerParagraphIndexFromBlockIndex(blockIndex, work.bodyJson, work.bodyText ?? '')
    readingAnchor.current = {
      paragraphIndex,
      positionOffset: 0,
      percent: readingAnchor.current.percent,
    }
    setTocOpen(false)
    if (prefs.mode === 'scroll') {
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) scrollToReadingPosition(el, paragraphIndex, 0)
        const root = el ?? document
        focusReaderHeading(blockIndex, root)
      })
      return
    }
    const totalParas = paragraphCount(work.bodyJson, work.bodyText ?? '')
    readingAnchor.current = {
      paragraphIndex,
      positionOffset: 0,
      percent: Math.round(((paragraphIndex + 1) / Math.max(1, totalParas)) * 100),
    }
    requestAnimationFrame(() => {
      recomputePageLayout()
      const content = contentRef.current
      const root = content ?? document
      focusReaderHeading(blockIndex, root)
    })
  }

  if (problem) {
    return (
      <div className="min-h-dvh bg-bg p-4">
        <ErrorState title="Cannot open reader" message={problem} onRetry={() => navigate(`/c/${id}`)} />
      </div>
    )
  }

  if (!work) {
    return (
      <div className="min-h-dvh bg-bg p-4">
        <Skeleton variant="text-lines" lines={6} />
      </div>
    )
  }

  const plain = work.bodyText ?? bodyTextFromJson(work.bodyJson, work.bodyText)
  const words = countWords(plain)
  const minutesLeft = formatMinutesLeft(estimatedMinutesRemaining(words, percent))
  const toc = tableOfContentsFromBody(work.bodyJson, work.bodyText)
  const surface = readerSurfaceClass(prefs.theme)
  const typography = readerTypographyClasses(prefs)
  const font = readerFontFamily(prefs.font)
  const pageLabel =
    prefs.mode === 'page'
      ? `Page ${pageIndex + 1} of ${totalPages} · ${pagesRemaining(pageIndex + 1, totalPages)} pages left`
      : minutesLeft

  const bodyRootRef = prefs.mode === 'scroll' ? scrollRef : contentRef

  return (
    <ReaderAnnotationHost
      work={work}
      bodyRootRef={bodyRootRef}
      offlineEnabled={offlineSaved}
      getCurrentPosition={() => readingAnchor.current}
      onHighlightsChange={setAnnotationHighlights}
      onBookmarksChange={setAnnotationBookmarks}
      onJumpToParagraph={jumpToBookmark}
    >
      {({
        highlights,
        bookmarkParagraphs,
        onHighlightPress,
        offlineBanner,
        toggleBookmark,
        jumpToBookmark: jumpFromSettings,
      }) => {
        openHighlightRef.current = onHighlightPress
        const bookmarkAtCurrent = annotationBookmarks.some((b) => b.paragraph === currentParagraph)

        return (
          <div
            data-reader-theme={prefs.theme}
            data-reader-mode={prefs.mode}
            className={`min-h-dvh ${surface} ${font}`}
            style={{
              filter: `brightness(${prefs.brightness})`,
              ['--reader-line-height' as string]: readerLineHeightValue(prefs.lineSpacing),
            }}
          >
            {offlineBanner ? (
              <p className="bg-coral/20 px-4 py-2 text-center text-xs text-inherit" role="status">
                You are reading offline. Changes sync when you reconnect.
              </p>
            ) : null}
            <header
              className={`sticky top-0 z-20 border-b border-black/10 bg-inherit/90 backdrop-blur transition-transform motion-reduce:transition-none ${
                toolbarVisible ? 'translate-y-0' : '-translate-y-full'
              }`}
            >
              <div className="mx-auto flex max-w-[65ch] items-center justify-between gap-2 px-3 py-2 md:px-4">
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => navigate(-1)}
                  className={`min-h-11 min-w-11 rounded-full ${focusRing}`}
                >
                  ←
                </button>
                <p className="truncate text-sm font-medium">{title}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={bookmarkAtCurrent ? 'Remove bookmark' : 'Bookmark this spot'}
                    aria-pressed={bookmarkAtCurrent}
                    onClick={toggleBookmark}
                    className={`min-h-11 rounded-full px-3 text-sm ${focusRing}`}
                  >
                    {bookmarkAtCurrent ? '★' : '☆'}
                  </button>
                  {toc.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setTocOpen((v) => !v)}
                      className={`min-h-11 rounded-full px-3 text-sm ${focusRing}`}
                    >
                      Contents
                    </button>
                  ) : null}
                  <button
                    ref={settingsButtonRef}
                    type="button"
                    aria-label="Reading settings"
                    onClick={() => setSettingsOpen(true)}
                    className={`min-h-11 rounded-full px-3 text-sm ${focusRing}`}
                  >
                    Aa
                  </button>
                </div>
              </div>
              <p className="mx-auto max-w-[65ch] px-4 pb-2 text-xs text-inherit" aria-live="polite">
                {percent}% · {pageLabel}
              </p>
            </header>

            {tocOpen && toc.length > 0 ? (
              <div className="mx-auto max-w-[65ch] p-4">
                <ReaderTableOfContents entries={toc} onPick={navigateToToc} onClose={() => setTocOpen(false)} />
              </div>
            ) : null}

            {prefs.mode === 'scroll' ? (
              <article
                ref={scrollRef}
                data-reader-scroll
                tabIndex={0}
                aria-label="Reading text"
                onScroll={onScroll}
                className={`mx-auto max-w-[65ch] select-text overflow-y-auto py-6 text-inherit md:max-w-[65ch] ${typography}`}
                style={{ maxHeight: 'calc(100dvh - 5rem)' }}
              >
                <RichTextView
                  readerAnchors
                  bodyJson={work.bodyJson}
                  bodyText={work.bodyText ?? ''}
                  creationType={work.type}
                  highlights={highlights}
                  bookmarkParagraphs={bookmarkParagraphs}
                  onHighlightPress={onHighlightPress}
                />
              </article>
            ) : (
              <div
                ref={pageViewportRef}
                data-reader-page-viewport
                tabIndex={0}
                aria-label="Paged reading"
                className="relative mx-auto h-[calc(100dvh-5.5rem)] max-w-[65ch] overflow-hidden"
                onClick={onPageTap}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <div
                  ref={pageTrackRef}
                  className="flex h-full transition-transform duration-300 motion-reduce:transition-none motion-reduce:duration-0"
                  style={{
                    transform: `translateX(-${pageIndex * Math.max(pageWidth, 1)}px)`,
                  }}
                >
                  <div
                    ref={contentRef}
                    data-reader-page-body
                    className={`h-full shrink-0 select-text text-inherit ${typography}`}
                    style={{
                      columnWidth: pageWidth > 0 ? `${pageWidth}px` : '100%',
                      columnGap: 0,
                      columnFill: 'auto',
                      width: pageWidth > 0 ? `${pageWidth}px` : '100%',
                      height: '100%',
                    }}
                  >
                    <RichTextView
                      readerAnchors
                      bodyJson={work.bodyJson}
                      bodyText={work.bodyText ?? ''}
                      creationType={work.type}
                      className="max-w-none gap-4 px-0"
                      highlights={highlights}
                      bookmarkParagraphs={bookmarkParagraphs}
                      onHighlightPress={onHighlightPress}
                    />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
                  <p className="rounded-full bg-black/20 px-3 py-1 text-xs">
                    Page {pageIndex + 1} of {totalPages}
                  </p>
                </div>
              </div>
            )}

            <ReaderSettingsSheet
              open={settingsOpen}
              prefs={prefs}
              onChange={onPrefsChange}
              offlineSaved={offlineSaved}
              offlineBusy={offlineBusy}
              highlights={annotationHighlights}
              bookmarks={annotationBookmarks}
              onJumpToBookmark={(paragraph, offset) => {
                jumpFromSettings(paragraph, offset)
                jumpToBookmark(paragraph, offset)
              }}
              onOpenHighlight={(highlightId) => openHighlightRef.current(highlightId)}
              onOfflineSavedChange={(enabled) => {
                void (async () => {
                  setOfflineBusy(true)
                  if (enabled) {
                    const result = await enableOfflineReadingForWork(work, readingAnchor.current)
                    if (!result.ok) showToast(result.message)
                    else setOfflineSaved(true)
                  } else {
                    await disableOfflineReadingForCreation(work.id)
                    setOfflineSaved(false)
                  }
                  setOfflineBusy(false)
                })()
              }}
              onClose={() => {
                setSettingsOpen(false)
                settingsButtonRef.current?.focus()
              }}
            />

            <p className="sr-only">
              <Link to={`/c/${id}`}>Post details</Link>
            </p>
          </div>
        )
      }}
    </ReaderAnnotationHost>
  )
}
