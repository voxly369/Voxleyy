import { focusRing } from '../shell/navItems.ts'

type CoverStudioToolbarProps = {
  canUndo: boolean
  canRedo: boolean
  showGrid: boolean
  showSafeArea: boolean
  saveLabel: string
  exportBusy: boolean
  canGroup: boolean
  canUngroup: boolean
  canAlign: boolean
  onUndo: () => void
  onRedo: () => void
  onToggleGrid: () => void
  onToggleSafeArea: () => void
  onGroup: () => void
  onUngroup: () => void
  onAlignCenter: () => void
  onExport: () => void
  onImportFinished: () => void
}

export function CoverStudioToolbar({
  canUndo,
  canRedo,
  showGrid,
  showSafeArea,
  saveLabel,
  exportBusy,
  canGroup,
  canUngroup,
  canAlign,
  onUndo,
  onRedo,
  onToggleGrid,
  onToggleSafeArea,
  onGroup,
  onUngroup,
  onAlignCenter,
  onExport,
  onImportFinished,
}: CoverStudioToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2"
      data-testid="cover-studio-toolbar"
    >
      <button
        type="button"
        aria-label="Undo"
        data-testid="cover-undo"
        disabled={!canUndo}
        onClick={onUndo}
        className={`min-h-11 min-w-11 rounded-xl border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
      >
        Undo
      </button>
      <button
        type="button"
        aria-label="Redo"
        data-testid="cover-redo"
        disabled={!canRedo}
        onClick={onRedo}
        className={`min-h-11 min-w-11 rounded-xl border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
      >
        Redo
      </button>
      <button
        type="button"
        aria-pressed={showGrid}
        onClick={onToggleGrid}
        className={`min-h-11 rounded-xl border border-line px-3 text-sm ${showGrid ? 'bg-coral/15' : ''} ${focusRing}`}
      >
        Grid
      </button>
      <button
        type="button"
        aria-pressed={showSafeArea}
        onClick={onToggleSafeArea}
        className={`min-h-11 rounded-xl border border-line px-3 text-sm ${showSafeArea ? 'bg-coral/15' : ''} ${focusRing}`}
      >
        Safe area
      </button>
      <button
        type="button"
        data-testid="cover-group"
        disabled={!canGroup}
        onClick={onGroup}
        className={`min-h-11 rounded-xl border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
      >
        Group
      </button>
      <button
        type="button"
        data-testid="cover-ungroup"
        disabled={!canUngroup}
        onClick={onUngroup}
        className={`min-h-11 rounded-xl border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
      >
        Ungroup
      </button>
      <button
        type="button"
        data-testid="cover-align-center"
        disabled={!canAlign}
        onClick={onAlignCenter}
        className={`min-h-11 rounded-xl border border-line px-3 text-sm disabled:opacity-40 ${focusRing}`}
      >
        Align centre
      </button>
      <span className="ml-auto text-sm text-muted" data-testid="cover-design-save-status" aria-live="polite">
        {saveLabel}
      </span>
      <button
        type="button"
        onClick={onImportFinished}
        className={`min-h-11 rounded-xl border border-line px-3 text-sm ${focusRing}`}
      >
        Import finished cover
      </button>
      <button
        type="button"
        data-testid="cover-export-png"
        disabled={exportBusy}
        onClick={onExport}
        className={`min-h-11 rounded-xl bg-coral px-4 text-sm font-semibold text-[#1a100a] disabled:opacity-50 ${focusRing}`}
      >
        Export PNG
      </button>
    </div>
  )
}
