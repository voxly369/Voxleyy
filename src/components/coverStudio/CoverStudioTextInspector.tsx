import type { CoverLayer } from '../../lib/coverStudio/designSchema.ts'
import { COVER_BRAND_PALETTE } from '../../lib/coverStudio/brandPalette.ts'
import { COVER_FONT_CATALOG, COVER_FONT_CATEGORIES, fontsInCategory } from '../../lib/coverStudio/fonts/catalog.ts'
import { focusRing } from '../shell/navItems.ts'

type TextLayer = Extract<CoverLayer, { type: 'text' }>

type CoverStudioTextInspectorProps = {
  layer: TextLayer | null
  onChange: (patch: Partial<TextLayer>) => void
}

export function CoverStudioTextInspector({ layer, onChange }: CoverStudioTextInspectorProps) {
  if (!layer) {
    return (
      <section className="rounded-xl border border-line bg-bg p-3 text-sm text-muted" aria-label="Text inspector">
        Select a text layer to edit typography.
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-3" aria-label="Text inspector">
      <h2 className="font-serif text-lg text-ink">Text</h2>
      <label className="flex flex-col gap-1 text-sm">
        Content
        <textarea
          value={layer.text}
          rows={3}
          onChange={(e) => onChange({ text: e.target.value })}
          className={`rounded-xl border border-line bg-surface px-3 py-2 ${focusRing}`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Font
        <select
          value={COVER_FONT_CATALOG.find((f) => f.label === layer.fontFamily)?.id ?? 'fraunces'}
          onChange={(e) => {
            const entry = COVER_FONT_CATALOG.find((f) => f.id === e.target.value)
            if (entry) onChange({ fontFamily: entry.label })
          }}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        >
          {COVER_FONT_CATEGORIES.map((cat) => (
            <optgroup key={cat.id} label={cat.label}>
              {fontsInCategory(cat.id).map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Size
          <input
            type="number"
            min={8}
            max={400}
            value={layer.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Colour
          <input
            type="color"
            value={layer.color.startsWith('#') ? layer.color : '#ffffff'}
            onChange={(e) => onChange({ color: e.target.value })}
            className={`min-h-11 w-full rounded-xl border border-line bg-surface ${focusRing}`}
            aria-label="Text colour"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Weight
        <select
          data-testid="cover-text-weight"
          value={layer.fontWeight}
          onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        >
          {[400, 500, 600, 700].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid="cover-text-italic"
          checked={layer.fontStyle === 'italic'}
          onChange={(e) => onChange({ fontStyle: e.target.checked ? 'italic' : 'normal' })}
        />
        Italic
      </label>
      <fieldset className="flex flex-col gap-1 text-sm">
        <legend>Alignment</legend>
        <div className="flex flex-wrap gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              type="button"
              data-testid={`cover-text-align-${align}`}
              aria-pressed={layer.align === align}
              onClick={() => onChange({ align })}
              className={`min-h-10 rounded-xl border border-line px-3 capitalize ${layer.align === align ? 'bg-coral/15' : ''} ${focusRing}`}
            >
              {align}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Line height
        <input
          type="range"
          min={0.8}
          max={3}
          step={0.05}
          data-testid="cover-text-line-height"
          value={layer.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Letter spacing
        <input
          type="range"
          min={-20}
          max={80}
          data-testid="cover-text-letter-spacing"
          value={layer.letterSpacing}
          onChange={(e) => onChange({ letterSpacing: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Opacity
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          data-testid="cover-text-opacity"
          value={layer.opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Shadow blur
        <input
          type="range"
          min={0}
          max={40}
          data-testid="cover-text-shadow"
          value={layer.shadow?.blur ?? 0}
          onChange={(e) =>
            onChange({
              shadow: {
                color: layer.shadow?.color ?? '#00000088',
                blur: Number(e.target.value),
                offsetX: layer.shadow?.offsetX ?? 2,
                offsetY: layer.shadow?.offsetY ?? 2,
              },
            })
          }
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Outline width
        <input
          type="range"
          min={0}
          max={12}
          data-testid="cover-text-outline"
          value={layer.outline?.width ?? 0}
          onChange={(e) =>
            onChange({
              outline: {
                color: layer.outline?.color ?? '#000000',
                width: Number(e.target.value),
              },
            })
          }
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Highlight padding
        <input
          type="range"
          min={0}
          max={24}
          data-testid="cover-text-highlight"
          value={layer.highlight?.padding ?? 0}
          onChange={(e) =>
            onChange({
              highlight: {
                color: layer.highlight?.color ?? '#ff5a3c55',
                padding: Number(e.target.value),
              },
            })
          }
          className={focusRing}
        />
      </label>
      <div className="flex flex-wrap gap-1" role="list" aria-label="Brand palette">
        {COVER_BRAND_PALETTE.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            role="listitem"
            aria-label={swatch.label}
            onClick={() => onChange({ color: swatch.hex })}
            className={`h-8 w-8 rounded-lg border border-line ${focusRing}`}
            style={{ backgroundColor: swatch.hex }}
          />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={layer.uppercase}
          onChange={(e) => onChange({ uppercase: e.target.checked })}
        />
        Uppercase
      </label>
    </section>
  )
}
