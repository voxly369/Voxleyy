import { useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { AUDIENCE_OPTIONS } from '../../lib/creations/audienceOptions.ts'
import { publishContentStats, validatePublishContent } from '../../lib/creations/publishValidation.ts'
import type { QuoteCardStyle } from '../../lib/creations/bodyDocument.ts'
import type { Audience } from '../../lib/creations/types.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { creationTypeLabel } from '../../lib/creations/creationTypeLabel.ts'
import { MOOD_OPTIONS, isCreationMood } from '../../lib/creations/moodOptions.ts'
import { LanguagePicker } from '../languages/LanguagePicker.tsx'
import { DEFAULT_CONTENT_LANGUAGE } from '../../lib/languages/defaultLanguage.ts'
import { publishBlockedWithoutMatureAck } from '../../lib/safety/matureContent.ts'

export type PublishConfirmPayload = {
  audience: Audience
  mood: string | null
  language: string
  containsSexualContent: boolean
  isMatureContent: boolean
}

type PublishSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  body: string
  caption: string
  tags: string[]
  coverUrl: string | null
  creationType: string
  quoteStyle?: QuoteCardStyle
  initialAudience: Audience
  initialMood?: string | null
  initialLanguage?: string
  initialContainsSexualContent?: boolean
  initialIsMatureContent?: boolean
  mode: 'publish' | 'audience'
  busy: boolean
  error: string | null
  onConfirm: (input: PublishConfirmPayload) => void
}

export function PublishSheet({
  open,
  onClose,
  title,
  body,
  caption,
  tags,
  coverUrl,
  creationType,
  quoteStyle,
  initialAudience,
  initialMood = null,
  initialLanguage = DEFAULT_CONTENT_LANGUAGE,
  initialContainsSexualContent = false,
  initialIsMatureContent = false,
  mode,
  busy,
  error,
  onConfirm,
}: PublishSheetProps) {
  const titleId = useId()
  const [audience, setAudience] = useState<Audience>(initialAudience)
  const [mood, setMood] = useState<string>(() => (isCreationMood(initialMood) ? initialMood : ''))
  const [language, setLanguage] = useState(() => initialLanguage.trim().toLowerCase() || DEFAULT_CONTENT_LANGUAGE)
  const [containsSexualContent, setContainsSexualContent] = useState(initialContainsSexualContent)
  const [matureContentAcknowledged, setMatureContentAcknowledged] = useState(
    initialIsMatureContent && initialContainsSexualContent,
  )

  const check = validatePublishContent({ title, body, caption, creationType, quoteStyle })
  const stats = publishContentStats(body)
  const matureBlock =
    mode === 'publish'
      ? publishBlockedWithoutMatureAck({
          containsSexualContent,
          matureContentAcknowledged,
        })
      : null
  const canSubmit = check.ok && !busy && !matureBlock
  const heading = mode === 'publish' ? 'Publish' : 'Update audience'
  const actionLabel = mode === 'publish' ? 'Publish' : 'Save audience'

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnEscape={!busy}
      labelledBy={titleId}
      containerClassName="fixed inset-0 flex items-end justify-center p-4 lg:items-center"
      className="flex max-h-[90dvh] w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
      backdropLabel="Close sheet"
    >
      <div className="overflow-y-auto p-5">
        <h2 id={titleId} className="font-serif text-2xl text-ink">
          {heading}
        </h2>
        <fieldset className="mt-4 flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink">Who can see this?</legend>
          {AUDIENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${audience === option.value ? 'border-coral bg-raised/50' : 'border-line'} ${focusRing}`}
            >
              <input
                type="radio"
                name="audience"
                value={option.value}
                checked={audience === option.value}
                onChange={() => setAudience(option.value)}
                className="mt-1 size-4 accent-coral"
              />
              <span className="flex flex-col gap-1">
                <span className="font-medium text-ink">{option.label}</span>
                <span className="text-sm text-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'publish' ? (
          <div className="mt-4">
            <LanguagePicker
              value={language}
              onChange={setLanguage}
              disabled={busy}
              testId="publish-language-picker"
            />
          </div>
        ) : null}

        {mode === 'publish' ? (
          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor={`${titleId}-mood`} className="text-sm font-medium text-ink">
              Mood (optional)
            </label>
            <select
              id={`${titleId}-mood`}
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              className={`min-h-11 rounded-2xl border border-line bg-surface px-3 text-base text-ink ${focusRing}`}
            >
              <option value="">No mood</option>
              {MOOD_OPTIONS.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {mode === 'publish' ? (
          <fieldset className="mt-4 flex flex-col gap-3 rounded-2xl border border-line p-3">
            <legend className="text-sm font-medium text-ink">Mature content</legend>
            <label className={`flex min-h-11 cursor-pointer items-start gap-3 ${focusRing}`}>
              <input
                type="checkbox"
                checked={containsSexualContent}
                disabled={busy}
                onChange={(event) => {
                  const next = event.target.checked
                  setContainsSexualContent(next)
                  if (!next) setMatureContentAcknowledged(false)
                }}
                className="mt-1 size-5 accent-coral"
              />
              <span className="text-sm text-ink">This post includes sexual content</span>
            </label>
            {containsSexualContent ? (
              <label className={`flex min-h-11 cursor-pointer items-start gap-3 ${focusRing}`}>
                <input
                  type="checkbox"
                  checked={matureContentAcknowledged}
                  disabled={busy}
                  onChange={(event) => setMatureContentAcknowledged(event.target.checked)}
                  className="mt-1 size-5 accent-coral"
                />
                <span className="text-sm text-ink">
                  I confirm this is mature content and may be hidden from readers who have not opted in
                </span>
              </label>
            ) : null}
            {matureBlock ? <p className="text-sm text-coral">{matureBlock}</p> : null}
          </fieldset>
        ) : null}

        <section className="mt-5 flex flex-col gap-2" aria-labelledby="publish-check-heading">
          <h3 id="publish-check-heading" className="text-sm font-medium text-ink">
            Content check
          </h3>
          {!check.ok ? <p className="text-sm text-coral">{check.message}</p> : null}
          <p className="text-sm text-muted">
            {stats.words} words · {stats.lines} lines · {stats.characters} characters
          </p>
        </section>

        <section className="mt-5 flex flex-col gap-2" aria-labelledby="publish-preview-heading">
          <h3 id="publish-preview-heading" className="text-sm font-medium text-ink">
            Preview
          </h3>
          <div className="flex gap-3 rounded-lg border border-line p-3">
            <ImageWithFallback
              src={coverUrl ?? undefined}
              alt=""
              label={title.trim().charAt(0) || 'U'}
              className="size-16 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-lg text-ink">{title.trim() || 'Untitled'}</p>
              <p className="text-sm text-muted">{creationTypeLabel(creationType)}</p>
              {tags.length > 0 ? (
                <p className="mt-1 truncate text-sm text-muted">{tags.join(', ')}</p>
              ) : null}
            </div>
          </div>
        </section>

        {error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}
      </div>
      <div className="flex flex-col gap-2 border-t border-line p-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={`min-h-11 rounded-2xl px-4 text-base font-medium text-ink ${focusRing}`}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onConfirm({
              audience,
              mood: isCreationMood(mood) ? mood : null,
              language: language.trim().toLowerCase() || DEFAULT_CONTENT_LANGUAGE,
              containsSexualContent: mode === 'publish' ? containsSexualContent : initialContainsSexualContent,
              isMatureContent:
                mode === 'publish'
                  ? containsSexualContent && matureContentAcknowledged
                  : initialIsMatureContent,
            })
          }
          className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white disabled:opacity-50 ${focusRing}`}
        >
          {busy ? 'Working…' : actionLabel}
        </button>
      </div>
    </Modal>
  )
}
