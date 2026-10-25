import { useState } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CreationEditor } from '../components/creations/CreationEditor.tsx'
import { PublishSheet } from '../components/creations/PublishSheet.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { ConfirmDialog } from '../components/states/ConfirmDialog.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { fetchProfileRole, publishCreation, saveCreationFields } from '../lib/creations/api.ts'
import { parseCreationType } from '../lib/creations/creationTypes.ts'
import { becameWriterAfterPublish } from '../lib/creations/roleChange.ts'
import { useCreationEditor } from '../lib/creations/useCreationEditor.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import NotFoundPage from './NotFoundPage.tsx'

export default function CreationEditorPage() {
  const { type: typeParam, id: idParam } = useParams()
  const parsedType = typeParam ? parseCreationType(typeParam) : null
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const seedBody =
    location.state && typeof location.state === 'object' && 'seedBody' in location.state
      ? String((location.state as { seedBody?: unknown }).seedBody ?? '')
      : null

  const editor = useCreationEditor({
    creationId: idParam ?? null,
    creationType: parsedType ?? 'written_post',
    seedBody,
  })

  const [publishOpen, setPublishOpen] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const blocker = useBlocker(editor.shouldBlockLeave)
  useDocumentTitle(editor.form.title.trim() || 'Draft')

  if (typeParam && !parsedType) return <NotFoundPage />

  if (editor.loading) {
    return (
      <PageContainer variant="editor" className="py-8">
        <Skeleton />
        <Skeleton variant="text-lines" lines={8} />
      </PageContainer>
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

  async function onPublishConfirm(input: {
    audience: import('../lib/creations/types.ts').Audience
    mood: string | null
    language: string
  }) {
    const id = editor.creationId
    if (!id) return
    setPublishError(null)
    setPublishBusy(true)
    const flushed = await editor.flushPendingSave()
    if (!flushed) {
      setPublishBusy(false)
      setPublishError('Save your latest changes before publishing.')
      return
    }

    const moodSave = await saveCreationFields({
      id,
      expectedUpdatedAt: editor.getUpdatedAt(),
      title: editor.form.title,
      caption: editor.form.caption,
      bodyText: editor.form.body,
      bodyJson: editor.buildPreviewBodyJson(),
      audience: input.audience,
      tags: editor.form.tags,
      mood: input.mood,
      language: input.language,
    })
    if (!moodSave.ok) {
      setPublishBusy(false)
      if ('conflict' in moodSave && moodSave.conflict) {
        setPublishError('Someone else saved a newer version. Reload and try again.')
        return
      }
      if ('error' in moodSave) {
        setPublishError(moodSave.error.message)
      } else {
        setPublishError('We could not save mood before publishing.')
      }
      return
    }

    const roleBefore = profile?.id ? await fetchProfileRole(profile.id) : null
    const beforeRole = roleBefore?.ok ? roleBefore.data : null

    const result = await publishCreation({
      id,
      audience: input.audience,
      expectedUpdatedAt: moodSave.updatedAt,
    })
    setPublishBusy(false)

    if (!result.ok) {
      if ('conflict' in result) {
        setPublishError('Someone else saved a newer version. Reload and try again.')
        return
      }
      setPublishError(result.error.message)
      return
    }

    setPublishOpen(false)
    const roleAfter = profile?.id ? await fetchProfileRole(profile.id) : null
    const afterRole = roleAfter?.ok ? roleAfter.data : null
    navigate(`/c/${id}`, {
      state: {
        published: editor.creationStatus !== 'published',
        writerPromoted: becameWriterAfterPublish(beforeRole, afterRole),
      },
    })
  }

  return (
    <PageContainer variant="editor" className="py-8">
      <PageHeader title={heading} />
      <CreationEditor
        creationType={parsedType ?? 'written_post'}
        editor={editor}
        coverUrl={editor.coverUrl}
        onCoverUrlChange={editor.setCoverUrl}
        onOpenPublish={() => setPublishOpen(true)}
      />
      <PublishSheet
        key={publishOpen ? editor.creationAudience : 'closed'}
        open={publishOpen}
        onClose={() => {
          setPublishOpen(false)
          setPublishError(null)
        }}
        title={editor.form.title}
        body={editor.form.body}
        caption={editor.form.caption}
        tags={editor.form.tags}
        coverUrl={editor.coverUrl}
        creationType={parsedType ?? 'written_post'}
        quoteStyle={parsedType === 'quote_card' ? editor.quoteStyle : undefined}
        initialAudience={editor.creationAudience}
        initialMood={editor.creationMood}
        initialLanguage={editor.creationLanguage}
        mode={editor.creationStatus === 'published' ? 'audience' : 'publish'}
        busy={publishBusy}
        error={publishError}
        onConfirm={(payload) => void onPublishConfirm(payload)}
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
    </PageContainer>
  )
}
