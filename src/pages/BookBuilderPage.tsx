import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookBuilderForm } from '../components/books/BookBuilderForm.tsx'
import { ChapterManager } from '../components/books/ChapterManager.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ConfirmDialog } from '../components/states/ConfirmDialog.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import {
  fetchBookById,
  fetchBookToc,
  fetchPaymentsEnabled,
  saveBookMetadata,
  updateBookCreationStatus,
} from '../lib/books/booksApi.ts'
import type { BookMetadataInput, BookRecord, BookTocChapter } from '../lib/books/bookSchema.ts'
import { publishDisabledReason } from '../lib/books/bookValidation.ts'
import {
  createChapter,
  deleteChapter,
  listChaptersForAuthor,
  publishChapter,
  reorderChapters,
  saveChapter,
  unpublishChapter,
} from '../lib/books/chaptersApi.ts'
import type { ChapterDetail } from '../lib/books/chapterContentSchema.ts'
import { plainTextToChapterJson } from '../lib/books/booksApi.ts'
import { ManuscriptImportFlow } from './ManuscriptImportFlow.tsx'
import type { ImportedChapter } from '../lib/books/importManuscript.ts'
import { deleteCreation } from '../lib/creations/api.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { useToast } from '../lib/shell/useToast.ts'

export default function BookBuilderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [chapters, setChapters] = useState<ChapterDetail[]>([])
  const [toc, setToc] = useState<BookTocChapter[]>([])
  const [paymentsEnabled, setPaymentsEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false)

  useDocumentTitle(book?.title ? `Builder · ${book.title}` : 'Book builder')

  const reload = useCallback(async () => {
    const [bookResult, chapterResult, tocResult, payments] = await Promise.all([
      fetchBookById(id),
      listChaptersForAuthor(id),
      fetchBookToc(id),
      fetchPaymentsEnabled(),
    ])
    if (!bookResult.ok) {
      setError(bookResult.error.message)
      return
    }
    setBook(bookResult.data)
    if (chapterResult.ok) setChapters(chapterResult.data)
    if (tocResult.ok) setToc(tocResult.data)
    setPaymentsEnabled(payments)
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  if (error && !book) {
    return (
      <PageContainer variant="editor" className="py-8">
        <ErrorState title="Book builder" message={error} onRetry={() => void reload()} />
      </PageContainer>
    )
  }

  if (!book) {
    return (
      <PageContainer variant="editor" className="py-8">
        <Skeleton variant="text-lines" lines={6} />
      </PageContainer>
    )
  }

  const isAuthor = profile?.id === book.authorId
  if (!isAuthor) {
    return (
      <PageContainer variant="editor" className="py-8">
        <ErrorState title="Book builder" message="Only the author can edit this book." onRetry={() => navigate(`/books/${id}`)} />
      </PageContainer>
    )
  }

  async function onSaveMetadata(input: BookMetadataInput) {
    const result = await saveBookMetadata(id, input)
    if (!result.ok) throw new Error(result.error.message)
    setBook(result.data)
    showToast('Book details saved')
  }

  async function onCreateChapter() {
    setBusy(true)
    const result = await createChapter(id, {
      title: `Chapter ${chapters.length + 1}`,
      bodyText: '',
      bodyJson: plainTextToChapterJson(''),
    })
    setBusy(false)
    if (!result.ok) {
      showToast(result.error.message)
      return
    }
    await reload()
    navigate(`/books/${id}/builder/chapter/${result.data.id}`)
  }

  async function onImport(chunks: ImportedChapter[]) {
    setBusy(true)
    for (const chunk of chunks) {
      const created = await createChapter(id, {
        title: chunk.title,
        bodyText: chunk.bodyText,
        bodyJson: chunk.bodyJson,
      })
      if (!created.ok) {
        showToast(created.error.message)
        break
      }
    }
    setBusy(false)
    await reload()
    showToast('Manuscript imported')
  }

  async function onReorder(orderedIds: string[]) {
    setBusy(true)
    const result = await reorderChapters(id, orderedIds)
    setBusy(false)
    if (!result.ok) showToast(result.error.message)
    else await reload()
  }

  const publishBlock = publishDisabledReason(
    {
      metadata: {
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        saleModel: book.saleModel,
        priceCents: book.priceCents,
        currency: book.currency,
        rentalDays: book.rentalDays,
        voxlyBookId: book.voxlyBookId,
        language: book.language,
      },
      hasCover: Boolean(book.coverUrl),
      chapters: toc,
    },
    paymentsEnabled,
  )

  return (
    <PageContainer variant="editor" className="flex flex-col gap-8 py-6 md:py-8">
      <div className="flex flex-col gap-2">
        <PageHeader title="Book builder" />
        <p className="text-sm text-muted">{book.title}</p>
        <div className="flex flex-wrap gap-2">
          <Link to={`/books/${id}`} className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}>
            View book page
          </Link>
          <Link to={`/books/${id}/cover`} className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}>
            Cover studio
          </Link>
          <button type="button" onClick={() => setImportOpen(true)} className={`min-h-11 text-sm font-medium text-coral ${focusRing}`}>
            Import manuscript
          </button>
        </div>
      </div>

      <BookBuilderForm book={book} disabled={busy} onSave={onSaveMetadata} />

      <ChapterManager
        bookId={id}
        chapters={chapters}
        busy={busy}
        onCreate={() => void onCreateChapter()}
        onDelete={(chapterId) => {
          setBusy(true)
          void deleteChapter(chapterId).then(async (result) => {
            setBusy(false)
            if (!result.ok) showToast(result.error.message)
            else await reload()
          })
        }}
        onReorder={(orderedIds) => void onReorder(orderedIds)}
        onToggleSample={(chapterId, isSample) => {
          const chapter = chapters.find((c) => c.id === chapterId)
          if (!chapter) return
          setBusy(true)
          void saveChapter(chapterId, {
            title: chapter.title,
            bodyText: chapter.bodyText ?? '',
            isSample,
            status: chapter.status,
          }).then(async (result) => {
            setBusy(false)
            if (!result.ok) showToast(result.error.message)
            else await reload()
          })
        }}
        onTogglePublish={(chapterId, publish) => {
          setBusy(true)
          void (publish ? publishChapter(chapterId) : unpublishChapter(chapterId)).then(async (result) => {
            setBusy(false)
            if (!result.ok) showToast(result.error.message)
            else await reload()
          })
        }}
      />

      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-serif text-xl text-ink">Publishing</h2>
        <p className="text-sm text-muted">Status: {book.status}</p>
        {publishBlock ? <p className="text-sm text-coral">{publishBlock}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || Boolean(publishBlock)}
            onClick={() => {
              setBusy(true)
              void updateBookCreationStatus(id, 'published').then(async (result) => {
                setBusy(false)
                if (!result.ok) showToast(result.error.message)
                else {
                  showToast('Book published')
                  await reload()
                }
              })
            }}
            className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] disabled:opacity-50 ${focusRing}`}
          >
            Publish book
          </button>
          {book.saleModel !== 'free' && !paymentsEnabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void updateBookCreationStatus(id, 'unlisted').then(async (result) => {
                  setBusy(false)
                  if (!result.ok) showToast(result.error.message)
                  else {
                    showToast('Book set to unlisted')
                    await reload()
                  }
                })
              }}
              className={`min-h-11 rounded-xl border border-line px-4 text-sm ${focusRing}`}
            >
              Save as unlisted
            </button>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmDeleteBook(true)}
          className={`min-h-11 self-start text-sm font-medium text-coral ${focusRing}`}
        >
          Delete book
        </button>
      </section>

      <ManuscriptImportFlow open={importOpen} busy={busy} onClose={() => setImportOpen(false)} onImport={onImport} />

      <ConfirmDialog
        open={confirmDeleteBook}
        title="Delete this book?"
        message="This removes the book and all chapters. It cannot be undone."
        confirmLabel="Delete book"
        cancelLabel="Cancel"
        onCancel={() => setConfirmDeleteBook(false)}
        onConfirm={() => {
          setConfirmDeleteBook(false)
          setBusy(true)
          void deleteCreation(id).then((result) => {
            setBusy(false)
            if (!result.ok) showToast(result.error.message)
            else {
              showToast('Book deleted')
              navigate('/profile')
            }
          })
        }}
      />
    </PageContainer>
  )
}
