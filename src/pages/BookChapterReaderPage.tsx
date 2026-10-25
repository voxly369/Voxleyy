import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RichTextView } from '../components/creations/RichTextView.tsx'
import { BookChapterAnnotationHost } from '../components/reader/BookChapterAnnotationHost.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import {
  fetchBookById,
  fetchBookReadingProgress,
  fetchBookToc,
  upsertBookReadingProgress,
} from '../lib/books/booksApi.ts'
import { fetchChapterById } from '../lib/books/chaptersApi.ts'
import type { BookTocChapter } from '../lib/books/bookSchema.ts'
import { userHasBookEntitlement } from '../lib/books/entitlementsApi.ts'
import { bodyContentFromJson } from '../lib/creations/richDocument.ts'
import { listHighlightsForChapter } from '../lib/reader/chapterHighlightsApi.ts'
import {
  createChapterBookmark,
  deleteChapterBookmark,
  listBookmarksForChapter,
} from '../lib/reader/chapterBookmarksApi.ts'
import { countWords, estimatedMinutesRemaining, formatMinutesLeft } from '../lib/reader/estimatedTime.ts'
import {
  hydrateReaderPreferencesFromAccount,
  loadReaderPreferences,
  saveReaderPreferencesLocal,
} from '../lib/reader/readerPreferencesStore.ts'
import type { ReaderPreferences } from '../lib/reader/readerPreferencesSchema.ts'
import {
  readerFontFamily,
  readerLineHeightValue,
  readerSurfaceClass,
  readerTypographyClasses,
} from '../lib/reader/readerThemeStyles.ts'
import { shouldSaveProgress } from '../lib/reader/throttleProgress.ts'
import { clampPageIndex, columnPageCount, pagesRemaining } from '../lib/reader/pagingMath.ts'
import { measureScrollReadingPosition, scrollToReadingPosition } from '../lib/reader/readingPosition.ts'
import { useAuth } from '../lib/auth/auth-context.ts'
import { contentLanguageForBook } from '../lib/languages/contentLanguageForBook.ts'
import { contentLangProps } from '../lib/languages/dir.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function BookChapterReaderPage() {
  const { bookId = '', chapterId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const readerTab = searchParams.get('tab') === 'highlights' ? 'highlights' : 'read'
  const [title, setTitle] = useState('Reading')
  const [bookTitle, setBookTitle] = useState('')
  const [bookContentLanguage, setBookContentLanguage] = useState('en')
  const [bodyDoc, setBodyDoc] = useState(() => bodyContentFromJson(null, ''))
  const [bodyText, setBodyText] = useState('')
  const [toc, setToc] = useState<BookTocChapter[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [unentitled, setUnentitled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences())
  const [savedHighlights, setSavedHighlights] = useState<{ id: string; quote: string }[]>([])
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)
  const [bookmarkPosition, setBookmarkPosition] = useState<{ paragraph: number; offset: number } | null>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const readingRootRef = useRef<HTMLElement | null>(null)
  const pageViewportRef = useRef<HTMLDivElement | null>(null)
  const pageTrackRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const lastSaveAt = useRef<number | null>(null)
  const resumeApplied = useRef(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageWidth, setPageWidth] = useState(0)
  const [layoutTick, setLayoutTick] = useState(0)

  useDocumentTitle(title)

  useEffect(() => {
    void hydrateReaderPreferencesFromAccount().then(setPrefs)
  }, [])

  useEffect(() => {
    let active = true
    resumeApplied.current = false
    void (async () => {
      setLoading(true)
      setProblem(null)
      setUnentitled(false)
      setBodyText('')
      const [bookResult, tocResult, entitled, progress] = await Promise.all([
        fetchBookById(bookId),
        fetchBookToc(bookId),
        userHasBookEntitlement(bookId),
        fetchBookReadingProgress(bookId),
      ])
      if (!active) return
      if (!bookResult.ok) {
        setLoading(false)
        setProblem(bookResult.error.message)
        return
      }
      const book = bookResult.data
      const isAuthor = profile?.id === book.authorId
      const tocChapters = tocResult.ok ? tocResult.data : []
      const chapterMeta = tocChapters.find((c) => c.id === chapterId)
      const canReadWithoutBody =
        isAuthor ||
        entitled ||
        chapterMeta?.isSample === true ||
        (book.saleModel === 'free' && chapterMeta?.status === 'published')
      if (!canReadWithoutBody) {
        setLoading(false)
        setUnentitled(true)
        return
      }
      const chapterResult = await fetchChapterById(chapterId)
      if (!active) return
      setLoading(false)
      if (!chapterResult.ok) {
        if (chapterResult.error.code === 'not_found') setUnentitled(true)
        else setProblem(chapterResult.error.message)
        return
      }
      const chapter = chapterResult.data
      const canRead =
        isAuthor ||
        entitled ||
        chapter.isSample ||
        (book.saleModel === 'free' && chapter.status === 'published')
      if (!canRead) {
        setUnentitled(true)
        return
      }
      setBookTitle(book.title)
      setBookContentLanguage(contentLanguageForBook(book.language))
      setTitle(chapter.title)
      setBodyText(chapter.bodyText ?? '')
      setBodyDoc(bodyContentFromJson(chapter.bodyJson as never, chapter.bodyText))
      setToc(tocChapters)
      const [hl, bookmarks] = await Promise.all([
        listHighlightsForChapter(chapterId),
        listBookmarksForChapter(chapterId),
      ])
      if (active) {
        setSavedHighlights(hl.map((h) => ({ id: h.id, quote: h.quote })))
        const first = bookmarks[0]
        setBookmarkId(first?.id ?? null)
        setBookmarkPosition(first ? { paragraph: first.paragraph, offset: first.paragraphOffset } : null)
      }
      if (progress?.chapterId === chapterId && scrollRef.current && !resumeApplied.current) {
        resumeApplied.current = true
        scrollToReadingPosition(scrollRef.current, progress.position, progress.positionOffset)
      }
    })()
    return () => {
      active = false
    }
  }, [bookId, chapterId, profile?.id])

  const recomputePageLayout = useCallback(() => {
    const viewport = pageViewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    const width = viewport.clientWidth
    setPageWidth(width)
    const pages = columnPageCount(content.scrollWidth, width)
    setTotalPages(pages)
    setPageIndex((prev) => clampPageIndex(prev, pages))
    setLayoutTick((n) => n + 1)
  }, [])

  useLayoutEffect(() => {
    if (prefs.mode !== 'page' || loading) return
    void document.fonts.ready.then(() => recomputePageLayout())
  }, [prefs.mode, loading, bodyDoc, prefs.textSizeStep, prefs.lineSpacing, prefs.font, recomputePageLayout])

  useEffect(() => {
    if (prefs.mode !== 'page') return
    const viewport = pageViewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(() => recomputePageLayout())
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [prefs.mode, recomputePageLayout, layoutTick])

  useEffect(() => {
    if (prefs.mode !== 'page' || loading) return
    const id = requestAnimationFrame(() => recomputePageLayout())
    return () => cancelAnimationFrame(id)
  }, [bodyText, loading, prefs.mode, recomputePageLayout])

  useEffect(() => {
    if (loading || !scrollRef.current) return
    void fetchBookReadingProgress(bookId).then((progress) => {
      if (progress?.chapterId === chapterId && scrollRef.current) {
        scrollToReadingPosition(scrollRef.current, progress.position, progress.positionOffset)
      }
    })
  }, [loading, bookId, chapterId])

  const saveProgress = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const measured = measureScrollReadingPosition(el)
    if (!measured || !shouldSaveProgress(lastSaveAt.current, Date.now())) return
    lastSaveAt.current = Date.now()
    void upsertBookReadingProgress({
      bookId,
      chapterId,
      percent: measured.percent,
      position: measured.paragraphIndex,
      positionOffset: measured.positionOffset,
    })
  }, [bookId, chapterId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => saveProgress()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [saveProgress, loading])

  if (loading) {
    return (
      <div className={`min-h-dvh ${readerSurfaceClass(prefs.theme)}`}>
        <Skeleton variant="text-lines" lines={10} />
      </div>
    )
  }

  if (unentitled) {
    return (
      <div className={`min-h-dvh ${readerSurfaceClass(prefs.theme)} px-4 py-8`} data-testid="book-reader-unentitled">
        <ErrorState title="Chapter locked" message="Not available to read" onRetry={() => navigate(`/books/${bookId}`)} />
      </div>
    )
  }

  if (problem) {
    return <ErrorState title="Chapter unavailable" message={problem} onRetry={() => navigate(`/books/${bookId}`)} />
  }

  const plain = bodyText || bodyDoc.content.map((b) => ('content' in b ? b.content?.map((i) => ('text' in i ? i.text : '')).join('') : '')).join('\n')
  const minutes = formatMinutesLeft(
    estimatedMinutesRemaining(countWords(plain), prefs.mode === 'page' ? pagesRemaining(totalPages, pageIndex) : 0),
  )
  const pageLabel = prefs.mode === 'page' ? `Page ${pageIndex + 1} of ${totalPages}` : null

  const index = toc.findIndex((c) => c.id === chapterId)
  const prev = index > 0 ? toc[index - 1] : null
  const next = index >= 0 && index < toc.length - 1 ? toc[index + 1] : null

  return (
    <BookChapterAnnotationHost
      chapterId={chapterId}
      chapterTitle={title}
      bodyJson={bodyDoc}
      bodyText={plain}
      bodyRootRef={readingRootRef}
      getCurrentPosition={() => {
        const el = scrollRef.current
        if (!el) return { paragraphIndex: 0, positionOffset: 0, percent: 0 }
        return measureScrollReadingPosition(el) ?? { paragraphIndex: 0, positionOffset: 0, percent: 0 }
      }}
    >
      {({ highlights, onHighlightPress, offlineBanner }) => (
        <div className={`flex min-h-dvh flex-col ${readerSurfaceClass(prefs.theme)}`} data-testid="book-chapter-reader">
          {offlineBanner ? (
            <p className="bg-raised px-4 py-2 text-center text-sm text-muted" data-testid="book-chapter-offline-banner">
              You are offline. Highlights sync when you reconnect.
            </p>
          ) : null}
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-line/40 bg-bg/90 px-4 py-3 backdrop-blur">
            <Link to={`/books/${bookId}`} className={`text-sm text-coral ${focusRing}`}>
              ← {bookTitle}
            </Link>
            <span className="text-sm text-muted">{pageLabel ?? `${minutes} left`}</span>
            {pageLabel ? (
              <span className="sr-only" aria-live="polite">
                {pageLabel}
              </span>
            ) : null}
          </header>
          <div className="flex gap-2 border-b border-line/30 px-4 py-2" role="tablist" aria-label="Reader panels">
            {(['read', 'highlights'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={readerTab === tab}
                onClick={() => setSearchParams(tab === 'read' ? {} : { tab: 'highlights' })}
                className={`min-h-11 rounded-full px-4 text-sm capitalize ${
                  readerTab === tab ? 'bg-coral font-semibold text-[#1a100a]' : 'border border-line'
                } ${focusRing}`}
              >
                {tab}
              </button>
            ))}
          </div>
          {readerTab === 'highlights' ? (
            <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
              {savedHighlights.length === 0 ? (
                <p className="text-sm text-muted">No highlights in this chapter yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {savedHighlights.map((row) => (
                    <li key={row.id} className="rounded-xl border border-line p-3 text-sm">
                      <p data-testid="book-chapter-highlight-snippet" {...contentLangProps(bookContentLanguage)}>
                        {row.quote}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : prefs.mode === 'page' ? (
            <div
              ref={pageViewportRef}
              data-reader-page-viewport
              tabIndex={0}
              aria-label="Paged reading"
              className="relative mx-auto h-[calc(100dvh-8rem)] w-full max-w-3xl flex-1 overflow-hidden px-4"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setPageIndex((p) => clampPageIndex(p + 1, totalPages))
                if (e.key === 'ArrowLeft') setPageIndex((p) => clampPageIndex(p - 1, totalPages))
              }}
            >
              <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted" data-testid="book-reader-page-indicator">
                {pageLabel}
              </p>
              <div
                ref={pageTrackRef}
                className="flex h-full transition-transform duration-300 motion-reduce:transition-none"
                style={{ transform: `translateX(-${pageIndex * Math.max(pageWidth, 1)}px)` }}
              >
                <div
                  ref={(node) => {
                    contentRef.current = node
                    readingRootRef.current = node
                  }}
                  data-reader-page-body
                  className={`h-full shrink-0 select-text ${readerTypographyClasses(prefs)}`}
                  style={{
                    columnWidth: pageWidth > 0 ? `${pageWidth}px` : '100%',
                    columnGap: 0,
                    columnFill: 'auto',
                    width: pageWidth > 0 ? `${pageWidth}px` : '100%',
                    height: '100%',
                    fontFamily: readerFontFamily(prefs.font),
                    lineHeight: readerLineHeightValue(prefs.lineSpacing),
                  }}
                >
                  <h1 className="mb-6 font-serif text-3xl text-ink" {...contentLangProps(bookContentLanguage)}>
                    {title}
                  </h1>
                  <RichTextView
                    bodyJson={bodyDoc as never}
                    bodyText={plain}
                    creationType="story"
                    contentLanguage={bookContentLanguage}
                    testId="book-chapter-body"
                    readerAnchors
                    highlights={highlights}
                    onHighlightPress={onHighlightPress}
                  />
                </div>
              </div>
            </div>
          ) : (
            <article
              ref={(node) => {
                scrollRef.current = node
                readingRootRef.current = node
              }}
              className={`mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8 ${readerTypographyClasses(prefs)}`}
              style={{
                fontFamily: readerFontFamily(prefs.font),
                lineHeight: readerLineHeightValue(prefs.lineSpacing),
              }}
              {...contentLangProps(bookContentLanguage)}
            >
              <h1 className="mb-6 font-serif text-3xl text-ink" {...contentLangProps(bookContentLanguage)}>
                {title}
              </h1>
              <RichTextView
                bodyJson={bodyDoc as never}
                bodyText={plain}
                creationType="story"
                contentLanguage={bookContentLanguage}
                testId="book-chapter-body"
                readerAnchors
                highlights={highlights}
                onHighlightPress={onHighlightPress}
              />
            </article>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 px-4 py-3">
            {prev ? (
              <button
                type="button"
                onClick={() => navigate(`/read/book/${bookId}/${prev.id}`)}
                className={`min-h-11 text-sm text-coral ${focusRing}`}
              >
                Previous
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className={`min-h-11 text-sm ${focusRing}`}
              aria-pressed={bookmarkId != null}
              onClick={() => {
                const el = scrollRef.current ?? readingRootRef.current
                if (!el) return
                const measured =
                  measureScrollReadingPosition(el) ?? ({ paragraphIndex: 0, positionOffset: 0, percent: 0 } as const)
                void (async () => {
                  if (bookmarkId) {
                    await deleteChapterBookmark(bookmarkId)
                    setBookmarkId(null)
                    return
                  }
                  const created = await createChapterBookmark({
                    chapterId,
                    paragraph: measured.paragraphIndex,
                    paragraphOffset: measured.positionOffset,
                  })
                  if (created.ok) {
                    setBookmarkId(created.bookmark.id)
                    setBookmarkPosition({
                      paragraph: created.bookmark.paragraph,
                      offset: created.bookmark.paragraphOffset,
                    })
                  }
                })()
              }}
            >
              Bookmark
            </button>
            {bookmarkId && bookmarkPosition ? (
              <button
                type="button"
                data-testid="jump-to-bookmark"
                className={`min-h-11 text-sm text-coral ${focusRing}`}
                onClick={() => {
                  const el = scrollRef.current ?? readingRootRef.current
                  if (!el) return
                  scrollToReadingPosition(el, bookmarkPosition.paragraph, bookmarkPosition.offset)
                }}
              >
                Jump to bookmark
              </button>
            ) : null}
            <button
              type="button"
              className={`min-h-11 text-sm ${focusRing}`}
              onClick={() => {
                void upsertBookReadingProgress({
                  bookId,
                  chapterId,
                  percent: 100,
                  position: 0,
                  positionOffset: 0,
                  completed: true,
                })
              }}
            >
              Mark finished
            </button>
            {next ? (
              <button
                type="button"
                onClick={() => {
                  if (scrollRef.current) scrollToReadingPosition(scrollRef.current, 0, 0)
                  navigate(`/read/book/${bookId}/${next.id}`)
                }}
                className={`min-h-11 text-sm text-coral ${focusRing}`}
              >
                Next chapter
              </button>
            ) : null}
            <button
              type="button"
              className={`min-h-11 text-sm ${focusRing}`}
              aria-pressed={prefs.mode === 'page'}
              onClick={() => {
                const nextMode = prefs.mode === 'page' ? 'scroll' : 'page'
                saveReaderPreferencesLocal({ ...prefs, mode: nextMode })
                setPrefs(loadReaderPreferences())
                setPageIndex(0)
              }}
            >
              {prefs.mode === 'page' ? 'Scroll mode' : 'Page mode'}
            </button>
            <button
              type="button"
              className={`min-h-11 text-sm ${focusRing}`}
              onClick={() => {
                saveReaderPreferencesLocal({ ...prefs, theme: prefs.theme === 'dark' ? 'paper' : 'dark' })
                setPrefs(loadReaderPreferences())
              }}
            >
              Theme
            </button>
            <button
              type="button"
              className={`min-h-11 text-sm ${focusRing}`}
              onClick={() => {
                saveReaderPreferencesLocal({ ...prefs, textSizeStep: Math.min(4, prefs.textSizeStep + 1) })
                setPrefs(loadReaderPreferences())
              }}
            >
              Increase text size
            </button>
          </footer>
          {toc.length > 0 ? (
            <nav aria-label="Table of contents" className="border-t border-line/30 px-4 py-2">
              <details>
                <summary className={`min-h-11 cursor-pointer text-sm text-coral ${focusRing}`}>Contents</summary>
                <ol className="mt-2 flex flex-col gap-1 text-sm">
                  {toc.map((ch) => (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/read/book/${bookId}/${ch.id}`)}
                        className={`min-h-11 text-left ${ch.id === chapterId ? 'font-semibold text-ink' : 'text-muted'} ${focusRing}`}
                      >
                        {ch.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </details>
            </nav>
          ) : null}
        </div>
      )}
    </BookChapterAnnotationHost>
  )
}
