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
  mode: 'publish' | 'audience'
  busy: boolean
  error: string | null
  onConfirm: (input: { audience: Audience; mood: string | null }) => void
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
  mode,
  busy,
  error,
  onConfirm,
}: PublishSheetProps) {
  const titleId = useId()
  const [audience, setAudience] = useState<Audience>(initialAudience)
  const [mood, setMood] = useState<string>(() => (isCreationMood(initialMood) ? initialMood : ''))

  const check = validatePublishContent({ title, body, caption, creationType, quoteStyle })
  const stats = publishContentStats(body)
  const canSubmit = check.ok && !busy
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
          onClick={() => onConfirm({ audience, mood: isCreationMood(mood) ? mood : null })}
          className={`min-h-11 rounded-2xl bg-coral px-4 text-base font-semibold text-white disabled:opacity-50 ${focusRing}`}
        >
          {busy ? 'Working…' : actionLabel}
        </button>
      </div>
    </Modal>
  )
}
