import type { CoverLayer } from '../../lib/coverStudio/designSchema.ts'
import { focusRing } from '../shell/navItems.ts'

type CoverStudioLayersPanelProps = {
  layers: CoverLayer[]
  selectedIds: string[]
  onSelect: (layerId: string, additive: boolean) => void
  onToggleHidden: (layerId: string) => void
  onToggleLocked: (layerId: string) => void
  onMove: (layerId: string, direction: 'up' | 'down') => void
}

function layerLabel(layer: CoverLayer): string {
  if (layer.type === 'text') return layer.text.slice(0, 24) || 'Text'
  if (layer.type === 'sticker') return `Sticker ${layer.stickerId}`
  if (layer.type === 'image') return 'Image'
  return layer.type
}

export function CoverStudioLayersPanel({
  layers,
  selectedIds,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onMove,
}: CoverStudioLayersPanelProps) {
  const ordered = [...layers].reverse()
  return (
    <section className="flex flex-col gap-2" data-testid="cover-studio-layers" aria-label="Layers">
      <h2 className="font-serif text-lg text-ink">Layers</h2>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-line bg-bg p-2">
        {ordered.length === 0 ? (
          <li className="px-2 py-3 text-sm text-muted">No layers yet. Add text or pick a template.</li>
        ) : (
          ordered.map((layer) => {
            const selected = selectedIds.includes(layer.id)
            return (
              <li key={layer.id} className="flex items-center gap-1 rounded-lg bg-surface px-1 py-1">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={(e) => onSelect(layer.id, e.shiftKey)}
                  className={`min-h-10 flex-1 truncate rounded-lg px-2 text-left text-sm ${selected ? 'bg-coral/20 font-medium' : ''} ${focusRing}`}
                >
                  {layerLabel(layer)}
                </button>
                <button
                  type="button"
                  aria-label={layer.hidden ? 'Show layer' : 'Hide layer'}
                  onClick={() => onToggleHidden(layer.id)}
                  className={`min-h-10 min-w-10 rounded-lg text-xs ${focusRing}`}
                >
                  {layer.hidden ? 'Show' : 'Hide'}
                </button>
                <button
                  type="button"
                  aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  onClick={() => onToggleLocked(layer.id)}
                  className={`min-h-10 min-w-10 rounded-lg text-xs ${focusRing}`}
                >
                  {layer.locked ? 'Unlock' : 'Lock'}
                </button>
                <button
                  type="button"
                  aria-label="Move layer up"
                  onClick={() => onMove(layer.id, 'up')}
                  className={`min-h-10 min-w-10 rounded-lg text-xs ${focusRing}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move layer down"
                  onClick={() => onMove(layer.id, 'down')}
                  className={`min-h-10 min-w-10 rounded-lg text-xs ${focusRing}`}
                >
                  ↓
                </button>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
