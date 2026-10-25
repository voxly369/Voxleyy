import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoverStudioEditor } from '../components/coverStudio/CoverStudioEditor.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { fetchBookById } from '../lib/books/booksApi.ts'
import type { BookRecord } from '../lib/books/bookSchema.ts'
import { listCoverDesignsForBook } from '../lib/coverStudio/coverDesignsApi.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function CoverStudioPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initialDesignId, setInitialDesignId] = useState<string | null>(null)

  useDocumentTitle(book?.title ? `Cover · ${book.title}` : 'Cover studio')

  useEffect(() => {
    void fetchBookById(id).then((result) => {
      if (!result.ok) setError(result.error.message)
      else setBook(result.data)
    })
    void listCoverDesignsForBook(id).then((result) => {
      if (result.ok && result.data[0]) setInitialDesignId(result.data[0].id)
    })
  }, [id])

  if (error && !book) return <ErrorState title="Cover studio" message={error} onRetry={() => window.location.reload()} />
  if (!book || !profile?.id) {
    return (
      <PageContainer variant="editor" className="py-8">
        <Skeleton />
      </PageContainer>
    )
  }

  const authorName = book.author?.displayName || book.author?.username || profile.display_name || 'Author'

  return (
    <PageContainer variant="editor" className="flex flex-col gap-6 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader title="Cover studio" />
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/cover-designs" className={`text-sm text-coral ${focusRing}`}>
            My cover designs
          </Link>
          <button
            type="button"
            onClick={() => navigate(`/books/${book.id}/builder`)}
            className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}
          >
            Done
          </button>
        </div>
      </div>
      <Link to={`/books/${book.id}/builder`} className={`text-sm text-coral ${focusRing}`}>
        ← Back to builder
      </Link>
      <CoverStudioEditor
        key={initialDesignId ?? 'new'}
        userId={profile.id}
        bookId={book.id}
        bookTitle={book.title}
        authorLabel={authorName}
        onCoverUploaded={(url) => setBook({ ...book, coverUrl: url })}
      />
    </PageContainer>
  )
}
