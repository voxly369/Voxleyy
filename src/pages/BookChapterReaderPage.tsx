import { useCallback, useEffect, useRef, useState } from 'react'
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
import { measureScrollReadingPosition, scrollToReadingPosition } from '../lib/reader/readingPosition.ts'
import { useAuth } from '../lib/auth/auth-context.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function BookChapterReaderPage() {
  const { bookId = '', chapterId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const readerTab = searchParams.get('tab') === 'highlights' ? 'highlights' : 'read'
  const [title, setTitle] = useState('Reading')
  const [bookTitle, setBookTitle] = useState('')
  const [bodyDoc, setBodyDoc] = useState(() => bodyContentFromJson(null, ''))
  const [bodyText, setBodyText] = useState('')
  const [toc, setToc] = useState<BookTocChapter[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [unentitled, setUnentitled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences())
  const [savedHighlights, setSavedHighlights] = useState<{ id: string; quote: string }[]>([])
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const lastSaveAt = useRef<number | null>(null)
  const resumeApplied = useRef(false)

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
      const [bookResult, chapterResult, tocResult, entitled, progress] = await Promise.all([
        fetchBookById(bookId),
        fetchChapterById(chapterId),
        fetchBookToc(bookId),
        userHasBookEntitlement(bookId),
        fetchBookReadingProgress(bookId),
      ])
      if (!active) return
      setLoading(false)
      if (!chapterResult.ok) {
        if (chapterResult.error.code === 'not_found') setUnentitled(true)
        else setProblem(chapterResult.error.message)
        return
      }
      if (!bookResult.ok) {
        setProblem(bookResult.error.message)
        return
      }
      const isAuthor = profile?.id === bookResult.data.authorId
      const chapter = chapterResult.data
      const canRead =
        isAuthor ||
        entitled ||
        chapter.isSample ||
        (bookResult.data.saleModel === 'free' && chapter.status === 'published')
      if (!canRead) {
        setUnentitled(true)
        return
      }
      setBookTitle(bookResult.data.title)
      setTitle(chapter.title)
      setBodyText(chapter.bodyText ?? '')
      setBodyDoc(bodyContentFromJson(chapter.bodyJson as never, chapter.bodyText))
      if (tocResult.ok) setToc(tocResult.data)
      const [hl, bookmarks] = await Promise.all([
        listHighlightsForChapter(chapterId),
        listBookmarksForChapter(chapterId),
      ])
      if (active) {
        setSavedHighlights(hl.map((h) => ({ id: h.id, quote: h.quote })))
        setBookmarkId(bookmarks[0]?.id ?? null)
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
        <ErrorState
          title="Chapter locked"
          message="Add this book to your library or read the sample chapter from the book page."
          onRetry={() => navigate(`/books/${bookId}`)}
        />
      </div>
    )
  }

  if (problem) {
    return <ErrorState title="Chapter unavailable" message={problem} onRetry={() => navigate(`/books/${bookId}`)} />
  }

  const plain = bodyText || bodyDoc.content.map((b) => ('content' in b ? b.content?.map((i) => ('text' in i ? i.text : '')).join('') : '')).join('\n')
  const minutes = formatMinutesLeft(estimatedMinutesRemaining(countWords(plain), 0))

  const index = toc.findIndex((c) => c.id === chapterId)
  const prev = index > 0 ? toc[index - 1] : null
  const next = index >= 0 && index < toc.length - 1 ? toc[index + 1] : null

  return (
    <BookChapterAnnotationHost
      chapterId={chapterId}
      chapterTitle={title}
      bodyJson={bodyDoc}
      bodyText={plain}
      bodyRootRef={scrollRef}
      getCurrentPosition={() => {
        const el = scrollRef.current
        if (!el) return { paragraphIndex: 0, positionOffset: 0, percent: 0 }
        return measureScrollReadingPosition(el) ?? { paragraphIndex: 0, positionOffset: 0, percent: 0 }
      }}
    >
      {({ highlights, onHighlightPress }) => (
        <div className={`flex min-h-dvh flex-col ${readerSurfaceClass(prefs.theme)}`} data-testid="book-chapter-reader">
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-line/40 bg-bg/90 px-4 py-3 backdrop-blur">
            <Link to={`/books/${bookId}`} className={`text-sm text-coral ${focusRing}`}>
              ← {bookTitle}
            </Link>
            <span className="text-sm text-muted">{minutes} left</span>
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
                      {row.quote}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <article
              ref={(node) => {
                scrollRef.current = node
              }}
              className={`mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-8 ${readerTypographyClasses(prefs)}`}
              style={{
                fontFamily: readerFontFamily(prefs.font),
                lineHeight: readerLineHeightValue(prefs.lineSpacing),
              }}
            >
              <h1 className="mb-6 font-serif text-3xl text-ink">{title}</h1>
              <RichTextView
                bodyJson={bodyDoc as never}
                bodyText={plain}
                creationType="story"
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
                const el = scrollRef.current
                if (!el) return
                const measured = measureScrollReadingPosition(el)
                if (!measured) return
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
                  if (created.ok) setBookmarkId(created.bookmark.id)
                })()
              }}
            >
              Bookmark
            </button>
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
              onClick={() => {
                saveReaderPreferencesLocal({ ...prefs, theme: prefs.theme === 'dark' ? 'paper' : 'dark' })
                setPrefs(loadReaderPreferences())
              }}
            >
              Theme
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
