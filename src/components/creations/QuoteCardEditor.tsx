import { MAX_QUOTE_LINE_CHARS } from '../../lib/creations/limits.ts'
import { quoteContrastWarning } from '../../lib/creations/publishValidation.ts'
import { isValidHexColor, type QuoteCardStyle } from '../../lib/creations/bodyDocument.ts'
import { focusRing } from '../shell/navItems.ts'
import { QuoteCardView } from './QuoteCardView.tsx'

const bgPresets = ['#1a1a1a', '#0f172a', '#1e3a5f', '#3b0764', '#14532d', '#422006', '#18181b', '#27272a']
const textPresets = ['#f5f5f5', '#fef3c7', '#e0e7ff', '#fce7f3', '#d1fae5', '#ffffff']

type QuoteCardEditorProps = {
  line: string
  style: QuoteCardStyle
  handle: string
  onLineChange: (line: string) => void
  onStyleChange: (patch: Partial<QuoteCardStyle>) => void
  onBlur: () => void
}

export function QuoteCardEditor({ line, style, handle, onLineChange, onStyleChange, onBlur }: QuoteCardEditorProps) {
  const warning = quoteContrastWarning(style)

  return (
    <div className="flex flex-col gap-6">
      <QuoteCardView text={line} style={style} handle={handle} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Quote line</span>
        <textarea
          value={line}
          maxLength={MAX_QUOTE_LINE_CHARS}
          onChange={(e) => onLineChange(e.target.value)}
          onBlur={onBlur}
          rows={4}
          className={`rounded-2xl border border-line bg-surface px-3 py-3 font-serif text-lg text-ink ${focusRing}`}
        />
        <span className="text-sm text-muted">
          {line.length} / {MAX_QUOTE_LINE_CHARS}
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Background</legend>
        <div className="flex flex-wrap gap-2">
          {bgPresets.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Background ${hex}`}
              onClick={() => onStyleChange({ background: hex })}
              className={`size-11 rounded-full border-2 ${style.background === hex ? 'border-coral' : 'border-line'} ${focusRing}`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Custom hex
          <input
            value={style.background}
            onChange={(e) => onStyleChange({ background: e.target.value })}
            onBlur={onBlur}
            className={`min-h-11 rounded-2xl border border-line bg-surface px-3 font-mono text-sm ${focusRing}`}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Text colour</legend>
        <div className="flex flex-wrap gap-2">
          {textPresets.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Text ${hex}`}
              onClick={() => onStyleChange({ color: hex })}
              className={`size-11 rounded-full border-2 ${style.color === hex ? 'border-coral' : 'border-line'} ${focusRing}`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Custom hex
          <input
            value={style.color}
            onChange={(e) => onStyleChange({ color: e.target.value })}
            onBlur={onBlur}
            className={`min-h-11 rounded-2xl border border-line bg-surface px-3 font-mono text-sm ${focusRing}`}
          />
        </label>
      </fieldset>

      {!isValidHexColor(style.background) || !isValidHexColor(style.color) ? (
        <p className="text-sm text-coral">Use a six-digit hex colour like #1a1a1a.</p>
      ) : null}
      {warning ? <p className="text-sm text-muted">{warning}</p> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Size</legend>
        <div className="flex flex-wrap gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onStyleChange({ size })}
              className={`min-h-11 rounded-2xl px-4 capitalize ${style.size === size ? 'bg-coral text-white' : 'border border-line'} ${focusRing}`}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
