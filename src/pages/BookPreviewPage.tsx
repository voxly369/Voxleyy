import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RichTextView } from '../components/creations/RichTextView.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { fetchBookById, fetchBookToc } from '../lib/books/booksApi.ts'
import { fetchChapterById } from '../lib/books/chaptersApi.ts'
import type { BookRecord, BookTocChapter } from '../lib/books/bookSchema.ts'
import { bodyContentFromJson } from '../lib/creations/richDocument.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function BookPreviewPage() {
  const { id = '', chapterId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [toc, setToc] = useState<BookTocChapter[]>([])
  const [chapterTitle, setChapterTitle] = useState<string | null>(null)
  const [bodyText, setBodyText] = useState('')
  const [bodyJson, setBodyJson] = useState(() => bodyContentFromJson(null, ''))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle(book ? `Preview · ${book.title}` : 'Preview')

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const [bookResult, tocResult] = await Promise.all([fetchBookById(id), fetchBookToc(id)])
      if (!active) return
      if (!bookResult.ok) {
        setError(bookResult.error.message)
        setLoading(false)
        return
      }
      setBook(bookResult.data)
      if (tocResult.ok) setToc(tocResult.data)
      if (chapterId) {
        const ch = await fetchChapterById(chapterId)
        if (!active) return
        if (!ch.ok) {
          setError(ch.error.message)
          setLoading(false)
          return
        }
        setChapterTitle(ch.data.title)
        setBodyText(ch.data.bodyText ?? '')
        setBodyJson(bodyContentFromJson(ch.data.bodyJson as never, ch.data.bodyText))
      } else {
        setChapterTitle(null)
        setBodyText('')
        setBodyJson(bodyContentFromJson(null, ''))
      }
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [id, chapterId])

  if (loading) {
    return (
      <PageContainer variant="editor" className="py-8">
        <Skeleton variant="text-lines" lines={8} />
      </PageContainer>
    )
  }

  if (error || !book) {
    return (
      <PageContainer variant="editor" className="py-8">
        <ErrorState title="Preview" message={error ?? 'Book not found'} onRetry={() => navigate(`/books/${id}/builder`)} />
      </PageContainer>
    )
  }

  const isAuthor = profile?.id === book.authorId
  if (!isAuthor) {
    return (
      <PageContainer variant="editor" className="py-8">
        <ErrorState title="Preview" message="Only the author can preview this book." onRetry={() => navigate(`/books/${id}`)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="editor" className="flex flex-col gap-6 py-6 md:py-8" testId="book-preview-page">
      <div
        role="status"
        className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-ink"
        data-testid="preview-banner"
      >
        Author preview — readers see published chapters only.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-2xl text-ink">{book.title}</h1>
        <Link to={`/books/${id}/builder`} className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}>
          Back to builder
        </Link>
      </div>
      {chapterId && chapterTitle ? (
        <article className="prose prose-invert max-w-3xl">
          <h2 className="font-serif text-xl text-ink">{chapterTitle}</h2>
          <RichTextView bodyJson={bodyJson as never} bodyText={bodyText} creationType="story" readerAnchors />
        </article>
      ) : (
        <section aria-labelledby="preview-toc-heading" className="flex flex-col gap-3">
          <h2 id="preview-toc-heading" className="font-serif text-xl text-ink">
            Table of contents
          </h2>
          <ol className="flex flex-col gap-2">
            {toc.map((ch) => (
              <li key={ch.id}>
                <Link
                  to={`/books/${id}/preview/chapter/${ch.id}`}
                  className={`min-h-11 inline-flex items-center text-coral ${focusRing}`}
                >
                  {ch.position}. {ch.title}
                  {ch.status !== 'published' ? ` (${ch.status})` : ''}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </PageContainer>
  )
}
