import { useBlocker, useParams } from 'react-router-dom'
import { CreationEditor } from '../components/creations/CreationEditor.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { ConfirmDialog } from '../components/states/ConfirmDialog.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { parseCreationType } from '../lib/creations/creationTypes.ts'
import { useCreationEditor } from '../lib/creations/useCreationEditor.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import NotFoundPage from './NotFoundPage.tsx'

export default function CreationEditorPage() {
  const { type: typeParam, id: idParam } = useParams()
  const parsedType = typeParam ? parseCreationType(typeParam) : null

  const editor = useCreationEditor({
    creationId: idParam ?? null,
    creationType: parsedType ?? 'written_post',
  })

  const blocker = useBlocker(editor.shouldBlockLeave)
  useDocumentTitle(editor.form.title.trim() || 'Draft')

  if (typeParam && !parsedType) return <NotFoundPage />

  if (editor.loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Skeleton />
        <Skeleton variant="text-lines" lines={8} />
      </div>
    )
  }

  if (editor.loadError) {
    return (
      <ErrorState
        title="Draft did not load"
        message={editor.loadError}
        onRetry={() => window.location.reload()}
      />
    )
  }

  const heading = parsedType ? `New ${parsedType.replace(/_/g, ' ')}` : 'Edit draft'

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <PageHeader title={heading} />
      <CreationEditor
        creationType={parsedType ?? 'written_post'}
        editor={editor}
        coverUrl={editor.coverUrl}
        onCoverUrlChange={editor.setCoverUrl}
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        message="You have unsaved changes. Stay on this page to keep editing, or leave and discard them."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  )
}
