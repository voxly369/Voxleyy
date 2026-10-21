import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RichTextView } from '../components/creations/RichTextView.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { fetchBookById, fetchBookToc, upsertBookReadingProgress } from '../lib/books/booksApi.ts'
import { fetchChapterById } from '../lib/books/chaptersApi.ts'
import type { BookTocChapter } from '../lib/books/bookSchema.ts'
import { bodyContentFromJson } from '../lib/creations/richDocument.ts'
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
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function BookChapterReaderPage() {
  const { bookId = '', chapterId = '' } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('Reading')
  const [bookTitle, setBookTitle] = useState('')
  const [bodyDoc, setBodyDoc] = useState(() => bodyContentFromJson(null, ''))
  const [toc, setToc] = useState<BookTocChapter[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences())
  const scrollRef = useRef<HTMLElement | null>(null)
  const lastSaveAt = useRef<number | null>(null)

  useDocumentTitle(title)

  useEffect(() => {
    void hydrateReaderPreferencesFromAccount().then(setPrefs)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setProblem(null)
      const [bookResult, chapterResult, tocResult] = await Promise.all([
        fetchBookById(bookId),
        fetchChapterById(chapterId),
        fetchBookToc(bookId),
      ])
      if (!active) return
      setLoading(false)
      if (!chapterResult.ok) {
        setProblem(chapterResult.error.message)
        return
      }
      if (!bookResult.ok) {
        setProblem(bookResult.error.message)
        return
      }
      setBookTitle(bookResult.data.title)
      setTitle(chapterResult.data.title)
      setBodyDoc(bodyContentFromJson(chapterResult.data.bodyJson as never, chapterResult.data.bodyText))
      if (tocResult.ok) setToc(tocResult.data)
    })()
    return () => {
      active = false
    }
  }, [bookId, chapterId])

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

  if (problem) {
    return <ErrorState title="Chapter unavailable" message={problem} onRetry={() => navigate(`/books/${bookId}`)} />
  }

  const plain = bodyDoc.content.map((b) => ('content' in b ? b.content?.map((i) => ('text' in i ? i.text : '')).join('') : '')).join('\n')
  const minutes = formatMinutesLeft(estimatedMinutesRemaining(countWords(plain), 0))

  const index = toc.findIndex((c) => c.id === chapterId)
  const prev = index > 0 ? toc[index - 1] : null
  const next = index >= 0 && index < toc.length - 1 ? toc[index + 1] : null

  return (
    <div className={`flex min-h-dvh flex-col ${readerSurfaceClass(prefs.theme)}`}>
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-line/40 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link to={`/books/${bookId}`} className={`text-sm text-coral ${focusRing}`}>
          ← {bookTitle}
        </Link>
        <span className="text-sm text-muted">{minutes} left</span>
      </header>
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
        <RichTextView bodyJson={bodyDoc as never} bodyText={plain} creationType="story" readerAnchors />
      </article>
      <footer className="flex items-center justify-between gap-2 border-t border-line/40 px-4 py-3">
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
    </div>
  )
}
