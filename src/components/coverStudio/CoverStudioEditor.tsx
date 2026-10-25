import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { COVER_TEMPLATES } from '../../lib/coverStudio/templates.generated.ts'
import type { CoverDesignDocument } from '../../lib/coverStudio/designSchema.ts'
import { emptyCoverDesign } from '../../lib/coverStudio/designSchema.ts'
import {
  createCoverDesignAutosave,
  createCoverDesign,
  updateCoverDesign,
  type CoverDesignRecord,
} from '../../lib/coverStudio/coverDesignsApi.ts'
import {
  cloneDesign,
  moveLayer,
  newLayerId,
  removeLayers,
  toggleSelection,
  updateLayer,
} from '../../lib/coverStudio/editorState.ts'
import {
  historyCanRedo,
  historyCanUndo,
  historyInit,
  historyPush,
  historyRedo,
  historyUndo,
  type HistoryState,
} from '../../lib/coverStudio/history.ts'
import { renderCoverDesignBlob } from '../../lib/coverStudio/exportRender.ts'
import { prepareBookCoverImport } from '../../lib/coverStudio/importCover.ts'
import { resolveCoverStorageImage } from '../../lib/coverStudio/storageImage.ts'
import { uploadCreationCover } from '../../lib/creations/coverUpload.ts'
import { CoverStudioCanvasStage } from './CoverStudioCanvasStage.tsx'
import { CoverStudioLayersPanel } from './CoverStudioLayersPanel.tsx'
import { CoverStudioTemplateGallery } from './CoverStudioTemplateGallery.tsx'
import { CoverStudioTextInspector } from './CoverStudioTextInspector.tsx'
import { CoverStudioToolbar } from './CoverStudioToolbar.tsx'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'

type CoverStudioEditorProps = {
  userId: string
  bookId: string
  bookTitle: string
  authorLabel: string
  initialDesign?: CoverDesignDocument
  initialRecord?: CoverDesignRecord | null
  onCoverUploaded?: (publicUrl: string) => void
}

type EditorState = {
  history: HistoryState<CoverDesignDocument>
  selectedIds: string[]
}

type EditorAction =
  | { type: 'push'; doc: CoverDesignDocument }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; layerId: string | null; additive: boolean }
  | { type: 'set_selected'; ids: string[] }

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'push':
      return {
        ...state,
        history: historyPush(state.history, action.doc),
      }
    case 'undo':
      return { ...state, history: historyUndo(state.history) }
    case 'redo':
      return { ...state, history: historyRedo(state.history) }
    case 'select':
      if (action.layerId === null) return { ...state, selectedIds: [] }
      return { ...state, selectedIds: toggleSelection(state.selectedIds, action.layerId, action.additive) }
    case 'set_selected':
      return { ...state, selectedIds: action.ids }
    default:
      return state
  }
}

export function CoverStudioEditor({
  userId,
  bookId,
  bookTitle,
  authorLabel,
  initialDesign,
  initialRecord,
  onCoverUploaded,
}: CoverStudioEditorProps) {
  const seed = initialDesign ?? emptyCoverDesign()
  const [state, dispatch] = useReducer(editorReducer, {
    history: historyInit(seed),
    selectedIds: [],
  })
  const design = state.history.present
  const [record, setRecord] = useState<CoverDesignRecord | null>(initialRecord ?? null)
  const [designName, setDesignName] = useState(initialRecord?.name ?? `${bookTitle} cover`)
  const [showGrid, setShowGrid] = useState(false)
  const [showSafeArea, setShowSafeArea] = useState(true)
  const [saveStatus, setSaveStatus] = useState('Ready')
  const [exportBusy, setExportBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const autosaveRef = useRef<ReturnType<typeof createCoverDesignAutosave> | null>(null)

  const resolveImage = useCallback(
    (storageKey: string) => resolveCoverStorageImage(userId, storageKey),
    [userId],
  )

  useEffect(() => {
    if (!record?.id) return
    autosaveRef.current = createCoverDesignAutosave(record.id, {
      onStatus: (status, detail) => {
        if (status === 'pending') setSaveStatus('Unsaved changes…')
        else if (status === 'saving') setSaveStatus('Saving…')
        else if (status === 'saved') setSaveStatus('Saved')
        else if (status === 'error') setSaveStatus(detail ?? 'Could not save')
      },
    })
    return () => autosaveRef.current?.cancel()
  }, [record?.id])

  function commit(next: CoverDesignDocument) {
    dispatch({ type: 'push', doc: next })
    if (record) {
      autosaveRef.current?.schedule({ design: next, name: designName })
    }
  }

  async function ensureRecord(): Promise<CoverDesignRecord | null> {
    if (record) return record
    const created = await createCoverDesign({ name: designName, design, bookId })
    if (!created.ok) {
      setSaveStatus(created.error.message)
      return null
    }
    setRecord(created.data)
    return created.data
  }

  useEffect(() => {
    if (!record) return
    autosaveRef.current?.schedule({ name: designName })
  }, [designName, record])

  const selectedTextLayer = useMemo(() => {
    const id = state.selectedIds[0]
    const layer = design.layers.find((l) => l.id === id)
    return layer?.type === 'text' ? layer : null
  }, [design.layers, state.selectedIds])

  function applyTemplate(templateId: string) {
    const template = COVER_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const doc = cloneDesign(template.design)
    doc.layers = doc.layers.map((layer) => {
      if (layer.type !== 'text') return layer
      if (layer.id === 'title') return { ...layer, text: bookTitle || layer.text }
      if (layer.id === 'author') return { ...layer, text: authorLabel || layer.text }
      return layer
    })
    commit(doc)
    dispatch({ type: 'set_selected', ids: [] })
  }

  function addTextLayer() {
    const layer = {
      id: newLayerId('text'),
      type: 'text' as const,
      x: 200,
      y: 400,
      width: 1200,
      height: 160,
      rotation: 0,
      opacity: 1,
      locked: false,
      hidden: false,
      text: 'New text',
      fontFamily: 'Fraunces',
      fontSize: 72,
      fontWeight: 600,
      fontStyle: 'normal' as const,
      color: '#ffffff',
      align: 'center' as const,
      lineHeight: 1.1,
      letterSpacing: 0,
      uppercase: false,
      shadow: null,
      outline: null,
      highlight: null,
    }
    commit({ ...design, layers: [...design.layers, layer] })
    dispatch({ type: 'select', layerId: layer.id, additive: false })
  }

  async function onExport() {
    setExportBusy(true)
    try {
      await ensureRecord()
      const blob = await renderCoverDesignBlob(design, { format: 'png', resolveImage })
      const file = new File([blob], `book-${bookId}-cover.png`, { type: 'image/png' })
      const uploaded = await uploadCreationCover(userId, bookId, file, file.name)
      if (!uploaded.ok) setSaveStatus(uploaded.error.message)
      else {
        setSaveStatus('Cover exported')
        onCoverUploaded?.(uploaded.data)
      }
    } catch {
      setSaveStatus('Could not export cover')
    } finally {
      setExportBusy(false)
    }
  }

  async function onImportFile(file: File | null) {
    if (!file) return
    try {
      const prepared = await prepareBookCoverImport(file)
      const storageKey = `import-${bookId}-${Date.now()}.webp`
      const uploaded = await uploadCreationCover(userId, bookId, prepared.blob, storageKey)
      if (!uploaded.ok) {
        setSaveStatus(uploaded.error.message)
        return
      }
      const layer = {
        id: newLayerId('img'),
        type: 'image' as const,
        x: 0,
        y: 0,
        width: design.width,
        height: design.height,
        rotation: 0,
        opacity: 1,
        locked: false,
        hidden: false,
        storageKey,
        fit: 'cover' as const,
        flipX: false,
        flipY: false,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        overlayColor: null,
      }
      commit({ ...design, layers: [layer, ...design.layers] })
      onCoverUploaded?.(uploaded.data)
      setImportOpen(false)
    } catch {
      setSaveStatus('Could not import cover')
    }
  }

  async function onSaveNow() {
    const saved = await ensureRecord()
    if (!saved) return
    const result = await updateCoverDesign(saved.id, { design, name: designName, bookId })
    if (result.ok) {
      setRecord(result.data)
      setSaveStatus('Saved')
    } else setSaveStatus(result.error.message)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="cover-studio-editor">
      <CoverStudioToolbar
        canUndo={historyCanUndo(state.history)}
        canRedo={historyCanRedo(state.history)}
        showGrid={showGrid}
        showSafeArea={showSafeArea}
        saveLabel={saveStatus}
        exportBusy={exportBusy}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onToggleGrid={() => setShowGrid((v) => !v)}
        onToggleSafeArea={() => setShowSafeArea((v) => !v)}
        onExport={() => void onExport()}
        onImportFinished={() => setImportOpen(true)}
      />
      <label className="flex max-w-md flex-col gap-1 text-sm">
        Design name
        <input
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          onBlur={() => void onSaveNow()}
          className={`min-h-11 rounded-xl border border-line bg-surface px-3 ${focusRing}`}
        />
      </label>
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <CoverStudioCanvasStage
            design={design}
            selectedIds={state.selectedIds}
            showGrid={showGrid}
            showSafeArea={showSafeArea}
            resolveImage={resolveImage}
            onSelect={(id, additive) => dispatch({ type: 'select', layerId: id, additive })}
            onMoveLayer={(layerId, x, y) => commit(updateLayer(design, layerId, { x, y }))}
          />
          <button
            type="button"
            onClick={addTextLayer}
            className={`min-h-11 self-start rounded-xl border border-line px-4 text-sm ${focusRing}`}
          >
            Add text
          </button>
        </div>
        <aside className="flex w-full flex-col gap-4 xl:w-96">
          <CoverStudioTextInspector
            layer={selectedTextLayer}
            onChange={(patch) => {
              if (!selectedTextLayer) return
              commit(updateLayer(design, selectedTextLayer.id, patch))
            }}
          />
          <CoverStudioLayersPanel
            layers={design.layers}
            selectedIds={state.selectedIds}
            onSelect={(layerId, additive) => dispatch({ type: 'select', layerId, additive })}
            onToggleHidden={(layerId) => {
              const layer = design.layers.find((l) => l.id === layerId)
              if (!layer) return
              commit(updateLayer(design, layerId, { hidden: !layer.hidden }))
            }}
            onToggleLocked={(layerId) => {
              const layer = design.layers.find((l) => l.id === layerId)
              if (!layer) return
              commit(updateLayer(design, layerId, { locked: !layer.locked }))
            }}
            onMove={(layerId, direction) => commit(moveLayer(design, layerId, direction))}
          />
          <CoverStudioTemplateGallery onApply={applyTemplate} />
          {state.selectedIds.length ? (
            <button
              type="button"
              onClick={() => commit(removeLayers(design, state.selectedIds))}
              className={`min-h-11 rounded-xl border border-line px-4 text-sm text-coral ${focusRing}`}
            >
              Delete selected
            </button>
          ) : null}
        </aside>
      </div>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} labelledBy="cover-import-title">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-xl">
          <h2 id="cover-import-title" className="font-serif text-xl text-ink">
            Import finished cover
          </h2>
          <p className="mt-2 text-sm text-muted">We centre-crop to 2:3 and resize to 1600×2400.</p>
          <input
            ref={importInputRef}
            type="file"
            accept="image/*"
            data-testid="cover-import-finished-input"
            className="mt-4 w-full text-sm"
            onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => setImportOpen(false)}
            className={`mt-4 min-h-11 rounded-xl border border-line px-4 text-sm ${focusRing}`}
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}
