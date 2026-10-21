import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { HIGHLIGHT_COLOURS, type HighlightColour, type ReaderHighlight } from '../../lib/reader/highlightSchema.ts'

type HighlightEditPanelProps = {
  open: boolean
  highlight: ReaderHighlight | null
  busy?: boolean
  onClose: () => void
  onSave: (patch: { colour: HighlightColour; note: string | null }) => void
  onDelete: () => void
}

export function HighlightEditPanel({ open, highlight, busy = false, onClose, onSave, onDelete }: HighlightEditPanelProps) {
  const titleId = useId()
  const noteId = useId()
  const [colour, setColour] = useState<HighlightColour>('yellow')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!highlight) return
    setColour(highlight.colour)
    setNote(highlight.note ?? '')
  }, [highlight])

  if (!highlight) return null

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-full max-w-md rounded-2xl border border-line bg-surface p-4">
      <h2 id={titleId} className="font-serif text-lg text-ink">
        Highlight
      </h2>
      <p className="mt-2 text-sm text-inherit opacity-80">{highlight.quote}</p>
      <fieldset className="mt-4 flex flex-wrap gap-2">
        <legend className="sr-only">Colour</legend>
        {HIGHLIGHT_COLOURS.map((value) => (
          <label key={value} className="inline-flex min-h-11 items-center gap-1 text-sm">
            <input type="radio" name="highlight-colour" checked={colour === value} onChange={() => setColour(value)} />
            {value}
          </label>
        ))}
      </fieldset>
      <label htmlFor={noteId} className="mt-4 block text-sm font-medium text-ink">
        Note
      </label>
      <textarea
        id={noteId}
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`mt-1 min-h-24 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink ${focusRing}`}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave({ colour, note: note.trim() ? note.trim() : null })}
          className={`min-h-11 rounded-xl bg-coral px-4 font-semibold text-[#1a100a] disabled:opacity-50 ${focusRing}`}
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className={`min-h-11 rounded-xl border border-line px-4 text-sm font-medium text-ink ${focusRing}`}
        >
          Delete highlight
        </button>
        <button type="button" onClick={onClose} className={`min-h-11 rounded-xl px-4 text-sm text-muted ${focusRing}`}>
          Close
        </button>
      </div>
    </Modal>
  )
}
