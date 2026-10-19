import { useState, type KeyboardEvent } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { MAX_TAGS_PER_CREATION } from '../../lib/creations/limits.ts'
import { addTag, removeTag } from '../../lib/creations/tags.ts'

type TagEditorProps = {
  tags: string[]
  onChange: (tags: string[]) => void
  onBlur?: () => void
}

export function TagEditor({ tags, onChange, onBlur }: TagEditorProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function commit(raw: string) {
    const result = addTag(tags, raw)
    if (result.error) setError(result.error)
    else setError(null)
    if (result.tags !== tags) onChange(result.tags)
    setInput('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(input)
      return
    }
    if (event.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(removeTag(tags, tags[tags.length - 1] ?? ''))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="creation-tags-input" className="text-sm font-medium text-ink">
        Tags
      </label>
      <div
        className={`flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 ${focusRing}`}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-1 text-sm text-ink"
          >
            #{tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              className={`min-h-11 min-w-11 rounded-full text-muted ${focusRing}`}
              onClick={() => onChange(removeTag(tags, tag))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="creation-tags-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (input.trim()) commit(input)
            onBlur?.()
          }}
          placeholder={tags.length ? 'Add another' : 'Add tags'}
          className="min-h-11 min-w-[8rem] flex-1 bg-transparent text-base text-ink outline-none"
        />
      </div>
      <p className="text-sm text-muted">
        {tags.length} / {MAX_TAGS_PER_CREATION} tags
      </p>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  )
}
