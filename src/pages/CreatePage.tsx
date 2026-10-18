import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { focusRing } from '../components/shell/navItems.ts'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { SubmitButton } from '../components/auth/SubmitButton.tsx'
import { TextField } from '../components/auth/TextField.tsx'
import { createDraft } from '../lib/creations/api.ts'
import { MAX_BODY_TEXT_OCTETS, MAX_TAGS_PER_CREATION } from '../lib/creations/limits.ts'
import { validateCreationFields } from '../lib/creations/validation.ts'

export default function CreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const tags = tagsRaw
      .split(/[\s,]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const issue = validateCreationFields({ body_text: body, tags })
    if (issue) {
      setError(issue.message)
      return
    }
    setBusy(true)
    const result = await createDraft({
      type: 'poem',
      title: title.trim() || null,
      body_text: body,
      tags,
      audience: 'private',
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    navigate(`/c/${result.data.id}`)
  }

  const bodyOctets = new TextEncoder().encode(body).length

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <PageHeader title="Written post" />
      <form className="flex flex-col gap-4" onSubmit={(e) => void onSave(e)}>
        <TextField
          id="creation-title"
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
        <label className="flex flex-col gap-1 text-base">
          <span className="font-medium text-ink">Body</span>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className={`rounded-md border border-line bg-surface px-3 py-2 font-serif text-lg text-ink ${focusRing}`}
          />
          <span className="text-sm text-muted">
            {bodyOctets.toLocaleString()} / {MAX_BODY_TEXT_OCTETS.toLocaleString()} bytes
          </span>
        </label>
        <TextField
          id="creation-tags"
          label={`Tags (up to ${MAX_TAGS_PER_CREATION}, separated by spaces)`}
          name="tags"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          autoComplete="off"
        />
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <SubmitButton disabled={busy}>Save draft</SubmitButton>
      </form>
    </div>
  )
}
