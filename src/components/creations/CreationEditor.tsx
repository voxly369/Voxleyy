import { useRef, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { useToast } from '../../lib/shell/useToast.ts'
import { audienceLabel } from '../../lib/creations/audienceOptions.ts'
import { bodyOctets, countLines } from '../../lib/creations/bodyDocument.ts'
import { prepareCoverImage } from '../../lib/creations/coverImage.ts'
import { removeCreationCover, uploadCreationCover } from '../../lib/creations/coverUpload.ts'
import { MAX_BODY_JSON_OCTETS, MAX_BODY_TEXT_OCTETS, MAX_CAPTION_CHARS } from '../../lib/creations/limits.ts'
import { MAX_TITLE_CHARS, usesLiterarySurface, type CreationType } from '../../lib/creations/creationTypes.ts'
import type { useCreationEditor } from '../../lib/creations/useCreationEditor.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { TagEditor } from './TagEditor.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { AudienceSelector } from './AudienceSelector.tsx'
import { CreationPreviewOverlay } from './CreationPreviewOverlay.tsx'
import { QuoteCardEditor } from './QuoteCardEditor.tsx'

type EditorState = ReturnType<typeof useCreationEditor>

type CreationEditorProps = {
  creationType: CreationType
  editor: EditorState
  coverUrl: string | null
  onCoverUrlChange: (url: string | null) => void
  onOpenPublish: () => void
}

export function CreationEditor({ creationType, editor, coverUrl, onCoverUrlChange, onOpenPublish }: CreationEditorProps) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [coverProgress, setCoverProgress] = useState<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const literary = usesLiterarySurface(creationType)
  const isQuote = creationType === 'quote_card'
  const bytes = bodyOctets(editor.form.body)
  const jsonBytes = new TextEncoder().encode(JSON.stringify(editor.buildPreviewBodyJson())).length
  const lines = countLines(editor.form.body)
  const status = editor.statusLabel
  const isLive = editor.creationStatus === 'published'

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

  async function onSaveDraft() {
    setSavingDraft(true)
    const ok = await editor.saveDraftNow()
    setSavingDraft(false)
    if (ok) showToast('Draft saved')
    else showToast('We could not save your draft. Try again.')
  }

  const authorPreview = {
    username: profile?.username ?? 'you',
    displayName: profile?.display_name ?? profile?.username ?? 'You',
    avatarUrl: profile?.avatar_url ?? null,
    verified: profile?.verified ?? false,
  }

  return (
    <div className="flex flex-col gap-6 pb-32">
      {isLive ? (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 px-4 py-3" role="status">
          <p className="font-medium text-ink">Live</p>
          <p className="text-sm text-muted">Changes you save here update the published work.</p>
          <p className="mt-1 text-sm text-muted">Audience: {audienceLabel(editor.creationAudience)}</p>
        </div>
      ) : null}
      <div
        className="sticky top-0 z-10 -mx-5 border-b border-line bg-bg/95 px-5 py-3 backdrop-blur"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="text-sm text-muted">{status || 'Start writing to save a draft'}</p>
        {editor.tagWarning ? <p className="mt-1 text-sm text-coral">{editor.tagWarning}</p> : null}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingDraft}
            onClick={() => void onSaveDraft()}
            className={`min-h-11 rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
          >
            {savingDraft ? 'Saving…' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={`min-h-11 rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
          >
            Preview
          </button>
          {editor.creationId ? (
            <button
              type="button"
              onClick={onOpenPublish}
              className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
            >
              {isLive ? 'Update audience' : 'Publish'}
            </button>
          ) : null}
        </div>
      </div>

      <AudienceSelector value={editor.creationAudience} onChange={editor.onAudienceChange} />

      {!isQuote ? (
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
      ) : null}

      {isQuote ? (
        <QuoteCardEditor
          line={editor.form.body}
          style={editor.quoteStyle}
          handle={profile?.username ?? 'you'}
          onLineChange={(body) => editor.onEdit({ body })}
          onStyleChange={editor.onQuoteStyleChange}
          onBlur={editor.onBlur}
        />
      ) : (
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
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Caption</span>
        <textarea
          value={editor.form.caption}
          maxLength={MAX_CAPTION_CHARS}
          onChange={(e) => editor.onEdit({ caption: e.target.value })}
          onBlur={editor.onBlur}
          rows={3}
          className={`rounded-2xl border border-line bg-surface px-3 py-2 text-base text-ink ${focusRing}`}
        />
        <span className="text-sm text-muted">
          {editor.form.caption.length} / {MAX_CAPTION_CHARS}
        </span>
      </label>

      <TagEditor tags={editor.form.tags} onChange={(tags) => editor.onEdit({ tags })} onBlur={editor.onBlur} />

      {!isQuote ? (
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
      ) : null}

      <CreationPreviewOverlay
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        creationType={creationType}
        title={editor.form.title}
        caption={editor.form.caption}
        body={editor.form.body}
        bodyJson={editor.buildPreviewBodyJson()}
        coverUrl={coverUrl}
        tags={editor.form.tags}
        author={authorPreview}
      />
    </div>
  )
}
