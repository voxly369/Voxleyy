import { focusRing } from '../shell/navItems.ts'
import { HIGHLIGHT_COLOURS, type HighlightColour } from '../../lib/reader/highlightSchema.ts'

type HighlightActionBarProps = {
  open: boolean
  top: number
  left: number
  canShareQuote: boolean
  onColour: (colour: HighlightColour) => void
  onAddNote: () => void
  onCopy: () => void
  onLookUp: () => void
  onShareQuote: () => void
}

const COLOUR_LABELS: Record<HighlightColour, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  orange: 'Orange',
}

export function HighlightActionBar({
  open,
  top,
  left,
  canShareQuote,
  onColour,
  onAddNote,
  onCopy,
  onLookUp,
  onShareQuote,
}: HighlightActionBarProps) {
  if (!open) return null
  return (
    <div
      role="toolbar"
      aria-label="Highlight actions"
      className="fixed z-40 flex max-w-[min(100vw-1rem,22rem)] flex-wrap gap-1 rounded-xl border border-line bg-surface p-2 shadow-lg"
      style={{ top, left }}
    >
      {HIGHLIGHT_COLOURS.map((colour) => (
        <button
          key={colour}
          type="button"
          aria-label={`Highlight ${COLOUR_LABELS[colour]}`}
          onClick={() => onColour(colour)}
          className={`min-h-11 min-w-11 rounded-lg border border-line bg-raised text-xs font-medium ${focusRing}`}
        >
          {COLOUR_LABELS[colour].slice(0, 1)}
        </button>
      ))}
      <button type="button" onClick={onAddNote} className={`min-h-11 rounded-lg px-2 text-xs font-medium ${focusRing}`}>
        Add note
      </button>
      <button type="button" onClick={onCopy} className={`min-h-11 rounded-lg px-2 text-xs font-medium ${focusRing}`}>
        Copy
      </button>
      <button type="button" onClick={onLookUp} className={`min-h-11 rounded-lg px-2 text-xs font-medium ${focusRing}`}>
        Look up
      </button>
      {canShareQuote ? (
        <button type="button" onClick={onShareQuote} className={`min-h-11 rounded-lg px-2 text-xs font-medium ${focusRing}`}>
          Share quote
        </button>
      ) : null}
    </div>
  )
}
