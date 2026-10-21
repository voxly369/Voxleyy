import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { createBookDraft } from '../lib/books/booksApi.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function BookNewPage() {
  useDocumentTitle('New book')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await createBookDraft({})
      if (!active) return
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      navigate(`/books/${result.data.id}/builder`, { replace: true })
    })()
    return () => {
      active = false
    }
  }, [navigate])

  if (error) {
    return (
      <PageContainer variant="editor" className="py-8">
        <ErrorState title="New book" message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="editor" className="flex flex-col gap-4 py-8">
      <PageHeader title="Starting your book" />
      <Skeleton variant="text-lines" lines={4} />
    </PageContainer>
  )
}
