import type { CoverLayer } from '../../lib/coverStudio/designSchema.ts'
import { focusRing } from '../shell/navItems.ts'

type ImageLayer = Extract<CoverLayer, { type: 'image' }>

type CoverStudioImageInspectorProps = {
  layer: ImageLayer | null
  onChange: (patch: Partial<ImageLayer>) => void
}

export function CoverStudioImageInspector({ layer, onChange }: CoverStudioImageInspectorProps) {
  if (!layer) {
    return (
      <section className="rounded-xl border border-line bg-bg p-3 text-sm text-muted" aria-label="Image inspector">
        Select an image layer to adjust filters.
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-3" aria-label="Image inspector">
      <h2 className="font-serif text-lg text-ink">Image</h2>
      <label className="flex flex-col gap-1 text-sm">
        Brightness
        <input
          type="range"
          min={0}
          max={200}
          data-testid="cover-image-brightness"
          value={layer.brightness}
          onChange={(e) => onChange({ brightness: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Contrast
        <input
          type="range"
          min={0}
          max={200}
          data-testid="cover-image-contrast"
          value={layer.contrast}
          onChange={(e) => onChange({ contrast: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Saturation
        <input
          type="range"
          min={0}
          max={200}
          data-testid="cover-image-saturation"
          value={layer.saturation}
          onChange={(e) => onChange({ saturation: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Blur
        <input
          type="range"
          min={0}
          max={20}
          data-testid="cover-image-blur"
          value={layer.blur}
          onChange={(e) => onChange({ blur: Number(e.target.value) })}
          className={focusRing}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Overlay
        <input
          type="color"
          data-testid="cover-image-overlay"
          value={layer.overlayColor?.startsWith('#') ? layer.overlayColor : '#ff5a3c'}
          onChange={(e) => onChange({ overlayColor: `${e.target.value}99` })}
          className={`min-h-11 w-full rounded-xl border border-line bg-surface ${focusRing}`}
          aria-label="Overlay colour"
        />
      </label>
    </section>
  )
}
