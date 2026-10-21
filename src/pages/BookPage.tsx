import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookPageActions } from '../components/books/BookPageActions.tsx'
import { CoverFrame } from '../components/creations/CoverFrame.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { fetchBookById, fetchBookToc, fetchBookReadingProgress, fetchPaymentsEnabled } from '../lib/books/booksApi.ts'
import type { BookRecord, BookTocChapter } from '../lib/books/bookSchema.ts'
import { formatPrice } from '../lib/books/bookValidation.ts'
import { claimFreeBook, userHasBookEntitlement } from '../lib/books/entitlementsApi.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { useToast } from '../lib/shell/useToast.ts'

export default function BookPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [toc, setToc] = useState<BookTocChapter[]>([])
  const [hasEntitlement, setHasEntitlement] = useState(false)
  const [paymentsEnabled, setPaymentsEnabled] = useState(false)
  const [progressChapterId, setProgressChapterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useDocumentTitle(book?.title ?? 'Book')

  useEffect(() => {
    let active = true
    void (async () => {
      const [bookResult, tocResult, entitled, payments, progress] = await Promise.all([
        fetchBookById(id),
        fetchBookToc(id),
        userHasBookEntitlement(id),
        fetchPaymentsEnabled(),
        fetchBookReadingProgress(id),
      ])
      if (!active) return
      if (!bookResult.ok) {
        setError(bookResult.error.message)
        return
      }
      setBook(bookResult.data)
      if (tocResult.ok) setToc(tocResult.data)
      setHasEntitlement(entitled)
      setPaymentsEnabled(payments)
      setProgressChapterId(progress?.chapterId ?? null)
    })()
    return () => {
      active = false
    }
  }, [id])

  if (error && !book) {
    return (
      <PageContainer variant="wide" className="py-8">
        <ErrorState title="Book" message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    )
  }

  if (!book) {
    return (
      <PageContainer variant="wide" className="py-8">
        <Skeleton variant="text-lines" lines={6} />
      </PageContainer>
    )
  }

  const isAuthor = profile?.id === book.authorId
  const readable = (chapter: BookTocChapter) =>
    isAuthor || hasEntitlement || chapter.isSample || (book.saleModel === 'free' && !chapter.comingSoon)

  function openChapter(chapter: BookTocChapter) {
    if (!readable(chapter)) return
    navigate(`/read/book/${book!.id}/${chapter.id}`)
  }

  function continueTarget(): BookTocChapter | undefined {
    if (progressChapterId) return toc.find((c) => c.id === progressChapterId)
    return toc.find((c) => readable(c))
  }

  return (
    <PageContainer variant="wide" className="flex flex-col gap-8 py-6 md:py-8" testId="book-page">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="w-full max-w-xs shrink-0">
          {book.coverUrl ? (
            <CoverFrame src={book.coverUrl} alt="" label="" className="aspect-[2/3] rounded-xl" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-bg text-sm text-muted">No cover yet</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <PageHeader title={book.title} />
          {book.subtitle ? <p className="font-serif text-lg text-muted">{book.subtitle}</p> : null}
          {book.author ? (
            <Link to={`/u/${book.author.username}`} className={`text-sm font-medium text-coral ${focusRing}`}>
              {book.author.displayName || book.author.username}
            </Link>
          ) : null}
          <p className="text-sm text-muted">{formatPrice(book.saleModel, book.priceCents, book.currency)}</p>
          {book.description ? <p className="whitespace-pre-wrap text-base text-ink">{book.description}</p> : null}
          <BookPageActions
            book={book}
            isAuthor={isAuthor}
            hasEntitlement={hasEntitlement}
            paymentsEnabled={paymentsEnabled}
            busy={busy}
            onEdit={() => navigate(`/books/${book.id}/builder`)}
            onContinueReading={() => {
              const target = continueTarget()
              if (target) openChapter(target)
            }}
            onClaimFree={() => {
              setBusy(true)
              void claimFreeBook(book.id).then((result) => {
                setBusy(false)
                if (!result.ok) showToast(result.error.message)
                else {
                  setHasEntitlement(true)
                  showToast('Added to your library')
                }
              })
            }}
          />
        </div>
      </div>

      <section aria-labelledby="book-toc-heading" className="flex flex-col gap-3">
        <h2 id="book-toc-heading" className="font-serif text-xl text-ink">
          Chapters
        </h2>
        <ol className="flex flex-col gap-2">
          {toc.map((chapter) => {
            const canRead = readable(chapter)
            return (
              <li key={chapter.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                {canRead ? (
                  <button
                    type="button"
                    onClick={() => openChapter(chapter)}
                    className={`min-h-11 w-full text-left font-medium text-ink ${focusRing}`}
                  >
                    {chapter.title}
                    {chapter.isSample ? <span className="ml-2 text-xs text-muted">Sample</span> : null}
                  </button>
                ) : (
                  <span className="flex min-h-11 items-center text-muted">
                    {chapter.title}
                    <span className="ml-2 text-xs">{chapter.comingSoon ? 'Coming soon' : 'Locked'}</span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </PageContainer>
  )
}
