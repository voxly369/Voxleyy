import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RichTextView } from '../components/creations/RichTextView.tsx'
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
import { scrollPercentFromElement } from '../lib/reader/scrollPercent.ts'
import { tableOfContentsFromBody } from '../lib/reader/toc.ts'
import { shouldSaveProgress } from '../lib/reader/throttleProgress.ts'
import { pageCount, pagesRemaining, clampPageIndex } from '../lib/reader/pagingMath.ts'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function ReaderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [work, setWork] = useState<CreationDetail | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => loadReaderPreferences())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const [percent, setPercent] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const lastScrollY = useRef(0)
  const lastSaveAt = useRef<number | null>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const pageViewportRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const title = work?.title?.trim() || 'Reading'
  useDocumentTitle(title)

  useEffect(() => {
    void hydrateReaderPreferencesFromAccount().then(setPrefs)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
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
        setPercent(saved.percent)
        requestAnimationFrame(() => {
          const el = scrollRef.current
          if (el && saved.percent > 0) {
            const max = el.scrollHeight - el.clientHeight
            el.scrollTop = (saved.percent / 100) * max
          }
        })
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const persistProgress = useCallback(
    (nextPercent: number, position: number) => {
      const now = Date.now()
      if (!shouldSaveProgress(lastSaveAt.current, now)) return
      lastSaveAt.current = now
      void upsertPostProgress({ creationId: id, percent: nextPercent, position })
    },
    [id],
  )

  const flushProgress = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const nextPercent = scrollPercentFromElement(el)
    setPercent(nextPercent)
    void upsertPostProgress({ creationId: id, percent: nextPercent, position: 0 })
  }, [id])

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
    const nextPercent = scrollPercentFromElement(el)
    setPercent(nextPercent)
    persistProgress(nextPercent, 0)
  }

  useEffect(() => {
    if (prefs.mode !== 'page' || !pageViewportRef.current || !contentRef.current) return
    setTotalPages(pageCount(contentRef.current.scrollHeight, pageViewportRef.current.clientHeight))
  }, [prefs.mode, work, prefs.textSizeStep, prefs.lineSpacing, prefs.marginStep])

  function turnPage(delta: number) {
    setPageIndex((prev) => clampPageIndex(prev + delta, totalPages))
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (prefs.mode !== 'page') return
      if (event.key === 'ArrowRight') turnPage(1)
      if (event.key === 'ArrowLeft') turnPage(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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

  return (
    <div
      data-reader-theme={prefs.theme}
      className={`min-h-dvh ${surface} ${font}`}
      style={{
        filter: `brightness(${prefs.brightness})`,
        ['--reader-line-height' as string]: readerLineHeightValue(prefs.lineSpacing),
      }}
    >
      <header
        className={`sticky top-0 z-20 border-b border-black/10 bg-inherit/90 backdrop-blur transition-transform motion-reduce:transition-none ${
          toolbarVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="mx-auto flex max-w-[65ch] items-center justify-between gap-2 px-3 py-2 md:px-4">
          <button type="button" aria-label="Back" onClick={() => navigate(-1)} className={`min-h-11 min-w-11 rounded-full ${focusRing}`}>
            ←
          </button>
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="flex items-center gap-1">
            {toc.length > 0 ? (
              <button type="button" onClick={() => setTocOpen((v) => !v)} className={`min-h-11 rounded-full px-3 text-sm ${focusRing}`}>
                Contents
              </button>
            ) : null}
            <button type="button" onClick={() => setSettingsOpen(true)} className={`min-h-11 rounded-full px-3 text-sm ${focusRing}`}>
              Aa
            </button>
          </div>
        </div>
        <p className="mx-auto max-w-[65ch] px-4 pb-2 text-xs opacity-70">
          {percent}% · {prefs.mode === 'page' ? `${pagesRemaining(pageIndex + 1, totalPages)} pages left` : minutesLeft}
        </p>
      </header>

      {tocOpen && toc.length > 0 ? (
        <div className="mx-auto max-w-[65ch] p-4">
          <ReaderTableOfContents
            entries={toc}
            onPick={() => setTocOpen(false)}
            onClose={() => setTocOpen(false)}
          />
        </div>
      ) : null}

      {prefs.mode === 'scroll' ? (
        <article
          ref={scrollRef}
          onScroll={onScroll}
          className={`mx-auto max-w-[65ch] overflow-y-auto py-6 md:max-w-[65ch] ${typography}`}
          style={{ maxHeight: 'calc(100dvh - 5rem)' }}
        >
          <RichTextView bodyJson={work.bodyJson} bodyText={work.bodyText ?? ''} creationType={work.type} />
        </article>
      ) : (
        <div ref={pageViewportRef} className="relative mx-auto h-[calc(100dvh-5.5rem)] max-w-[65ch] overflow-hidden">
          <div
            ref={contentRef}
            className={`flex h-full transition-transform duration-300 motion-reduce:transition-none motion-reduce:transform-none ${typography}`}
            style={{ width: `${totalPages * 100}%`, transform: `translateX(-${(pageIndex / totalPages) * 100}%)` }}
          >
            {Array.from({ length: totalPages }, (_, page) => (
              <div key={page} className="h-full w-full shrink-0 overflow-hidden px-4" onClick={() => turnPage(1)}>
                <RichTextView bodyJson={work.bodyJson} bodyText={work.bodyText ?? ''} creationType={work.type} />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-4 flex justify-between px-4">
            <button type="button" aria-label="Previous page" onClick={() => turnPage(-1)} className={`min-h-11 min-w-11 rounded-full bg-black/20 ${focusRing}`}>
              ‹
            </button>
            <button type="button" aria-label="Next page" onClick={() => turnPage(1)} className={`min-h-11 min-w-11 rounded-full bg-black/20 ${focusRing}`}>
              ›
            </button>
          </div>
        </div>
      )}

      <ReaderSettingsSheet open={settingsOpen} prefs={prefs} onChange={onPrefsChange} onClose={() => setSettingsOpen(false)} />

      <p className="sr-only">
        <Link to={`/c/${id}`}>Post details</Link>
      </p>
    </div>
  )
}
