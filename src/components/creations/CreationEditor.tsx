import { useRef, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { autosaveStatusLabel } from '../../lib/creations/autosave.ts'
import { bodyOctets, countLines } from '../../lib/creations/bodyDocument.ts'
import { prepareCoverImage } from '../../lib/creations/coverImage.ts'
import { removeCreationCover, uploadCreationCover } from '../../lib/creations/coverUpload.ts'
import { MAX_BODY_JSON_OCTETS, MAX_BODY_TEXT_OCTETS } from '../../lib/creations/limits.ts'
import { MAX_TITLE_CHARS, usesLiterarySurface, type CreationType } from '../../lib/creations/creationTypes.ts'
import type { useCreationEditor } from '../../lib/creations/useCreationEditor.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { TagEditor } from './TagEditor.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'

type EditorState = ReturnType<typeof useCreationEditor>

type CreationEditorProps = {
  creationType: CreationType
  editor: EditorState
  coverUrl: string | null
  onCoverUrlChange: (url: string | null) => void
}

export function CreationEditor({ creationType, editor, coverUrl, onCoverUrlChange }: CreationEditorProps) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [coverProgress, setCoverProgress] = useState<number | null>(null)
  const literary = usesLiterarySurface(creationType)
  const bytes = bodyOctets(editor.form.body)
  const jsonBytes = new TextEncoder().encode(JSON.stringify({ version: 1, format: 'plain', text: editor.form.body })).length
  const lines = countLines(editor.form.body)
  const status = autosaveStatusLabel(editor.autosave)

  async function onPickCover(file: File) {
    if (!user?.id || !editor.creationId) {
      setCoverError('Save your draft before adding a cover.')
      return
    }
    setCoverError(null)
    setCoverProgress(0)
    try {
      const prepared = await prepareCoverImage(file)
      const fileName = `${crypto.randomUUID()}.webp`
      const result = await uploadCreationCover(user.id, editor.creationId, prepared.blob, fileName, (ratio) =>
        setCoverProgress(ratio),
      )
      if (!result.ok) {
        setCoverError(result.error.message)
        return
      }
      onCoverUrlChange(result.data)
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'We could not upload this cover. Try again.')
    } finally {
      setCoverProgress(null)
    }
  }

  async function onRemoveCover() {
    if (!user?.id || !editor.creationId) return
    setCoverError(null)
    const result = await removeCreationCover(user.id, editor.creationId, coverUrl)
    if (!result.ok) {
      setCoverError(result.error.message)
      return
    }
    onCoverUrlChange(null)
  }

  return (
    <div className="flex flex-col gap-6 pb-32">
      <div
        className="sticky top-0 z-10 -mx-5 border-b border-line bg-bg/95 px-5 py-3 backdrop-blur"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="text-sm text-muted">{status || 'Start writing to save a draft'}</p>
        {editor.autosave.ui === 'error' ? (
          <button type="button" onClick={editor.retrySave} className={`mt-2 text-sm font-medium text-coral ${focusRing}`}>
            Retry save
          </button>
        ) : null}
        {editor.autosave.ui === 'conflict' ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void editor.reloadRemote()}
              className={`min-h-11 rounded-2xl bg-raised px-3 text-sm font-medium ${focusRing}`}
            >
              Load the newer version
            </button>
            <button
              type="button"
              onClick={() => void editor.overwriteRemote()}
              className={`min-h-11 rounded-2xl border border-line px-3 text-sm font-medium ${focusRing}`}
            >
              Keep my version (overwrite)
            </button>
          </div>
        ) : null}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Title</span>
        <input
          value={editor.form.title}
          maxLength={MAX_TITLE_CHARS}
          onChange={(e) => editor.onEdit({ title: e.target.value })}
          onBlur={editor.onBlur}
          className={`min-h-11 rounded-2xl border border-line bg-surface px-3 font-serif text-xl text-ink ${focusRing}`}
        />
        <span className="text-sm text-muted">
          {editor.form.title.length} / {MAX_TITLE_CHARS}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Body</span>
        <textarea
          value={editor.form.body}
          onChange={(e) => editor.onEdit({ body: e.target.value })}
          onBlur={editor.onBlur}
          rows={16}
          className={`max-w-[65ch] rounded-2xl border border-line bg-surface px-3 py-3 text-lg leading-relaxed text-ink ${literary ? 'font-serif' : ''} ${focusRing}`}
        />
        <span className="text-sm text-muted">
          {lines} lines · {bytes.toLocaleString()} / {MAX_BODY_TEXT_OCTETS.toLocaleString()} bytes · JSON{' '}
          {jsonBytes.toLocaleString()} / {MAX_BODY_JSON_OCTETS.toLocaleString()} bytes
        </span>
      </label>

      <TagEditor
        tags={editor.form.tags}
        onChange={(tags) => editor.onEdit({ tags })}
        onBlur={editor.onBlur}
      />

      <section className="flex flex-col gap-3" aria-labelledby="cover-heading">
        <h2 id="cover-heading" className="text-sm font-medium text-ink">
          Cover
        </h2>
        {coverUrl ? (
          <ImageWithFallback src={coverUrl} alt="" label="Cover" className="aspect-[3/2] w-full max-w-md rounded-lg" />
        ) : null}
        {coverProgress !== null ? (
          <p className="text-sm text-muted">Uploading… {Math.round(coverProgress * 100)}%</p>
        ) : null}
        {coverError ? <p className="text-sm text-coral">{coverError}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`min-h-11 rounded-2xl bg-raised px-4 text-base font-medium ${focusRing}`}
          >
            {coverUrl ? 'Replace cover' : 'Upload cover'}
          </button>
          {coverUrl ? (
            <button
              type="button"
              onClick={() => void onRemoveCover()}
              className={`min-h-11 rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onPickCover(file)
            e.target.value = ''
          }}
        />
      </section>
    </div>
  )
}
