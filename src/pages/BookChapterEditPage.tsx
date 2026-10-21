import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { fetchChapterById, saveChapter } from '../lib/books/chaptersApi.ts'
import { plainTextToChapterJson } from '../lib/books/booksApi.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { useToast } from '../lib/shell/useToast.ts'

export default function BookChapterEditPage() {
  const { id: bookId = '', chapterId = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useDocumentTitle(title || 'Edit chapter')

  useEffect(() => {
    void fetchChapterById(chapterId).then((result) => {
      setLoading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      if (result.data.bookId !== bookId) {
        setError('Chapter does not belong to this book.')
        return
      }
      setTitle(result.data.title)
      setBody(result.data.bodyText ?? '')
    })
  }, [bookId, chapterId])

  if (loading) {
    return (
      <PageContainer variant="editor" className="py-8">
        <Skeleton variant="text-lines" lines={8} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer variant="editor" className="py-8">
        <ErrorState title="Chapter" message={error} onRetry={() => navigate(`/books/${bookId}/builder`)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="editor" className="flex flex-col gap-4 py-6 md:py-8">
      <Link to={`/books/${bookId}/builder`} className={`text-sm text-coral ${focusRing}`}>
        ← Back to builder
      </Link>
      <PageHeader title="Edit chapter" />
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Body
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className={`rounded-xl border border-line bg-surface px-3 py-2 font-serif ${focusRing}`}
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          setSaving(true)
          void saveChapter(chapterId, {
            title,
            bodyText: body,
            bodyJson: plainTextToChapterJson(body),
          }).then((result) => {
            setSaving(false)
            if (!result.ok) showToast(result.error.message)
            else {
              showToast('Chapter saved')
              navigate(`/books/${bookId}/builder`)
            }
          })
        }}
        className={`min-h-11 self-start rounded-xl bg-coral px-6 font-semibold text-[#1a100a] disabled:opacity-60 ${focusRing}`}
      >
        {saving ? 'Saving…' : 'Save chapter'}
      </button>
    </PageContainer>
  )
}
