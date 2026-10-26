import { useCallback, useEffect, useRef, useState } from 'react'
import type { CoverDesignDocument, CoverLayer } from '../../lib/coverStudio/designSchema.ts'
import { COVER_DESIGN_HEIGHT, COVER_DESIGN_WIDTH } from '../../lib/coverStudio/designSchema.ts'
import { renderCoverDesignToCanvas } from '../../lib/coverStudio/exportRender.ts'
import { COVER_GRID_STEP, COVER_SAFE_INSET } from '../../lib/coverStudio/editorState.ts'
import { nudgePosition, snapRectCenter, type SnapGuide } from '../../lib/coverStudio/snap.ts'
import { focusRing } from '../shell/navItems.ts'

type CoverStudioCanvasStageProps = {
  design: CoverDesignDocument
  selectedIds: string[]
  showGrid: boolean
  showSafeArea: boolean
  extraGuides?: SnapGuide[]
  resolveImage?: (storageKey: string) => Promise<HTMLImageElement | null>
  onSelect: (layerId: string | null, additive: boolean) => void
  onMoveLayer: (layerId: string, x: number, y: number) => void
}

function hitTestLayer(layers: CoverLayer[], x: number, y: number): CoverLayer | null {
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i]
    if (!layer || layer.hidden) continue
    if (x >= layer.x && x <= layer.x + layer.width && y >= layer.y && y <= layer.y + layer.height) return layer
  }
  return null
}

export function CoverStudioCanvasStage({
  design,
  selectedIds,
  showGrid,
  showSafeArea,
  extraGuides = [],
  resolveImage,
  onSelect,
  onMoveLayer,
}: CoverStudioCanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(0.35)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ layerId: string; startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )
  const panDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([])
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  useEffect(() => {
    let cancelled = false
    void renderCoverDesignToCanvas(design, { resolveImage }).then((canvas) => {
      if (cancelled) return
      const target = canvasRef.current
      if (!target) return
      const ctx = target.getContext('2d')
      if (!ctx) return
      target.width = COVER_DESIGN_WIDTH
      target.height = COVER_DESIGN_HEIGHT
      ctx.drawImage(canvas, 0, 0)
    })
    return () => {
      cancelled = true
    }
  }, [design, resolveImage])

  const toDesignCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      const x = (clientX - rect.left - pan.x) / zoom
      const y = (clientY - rect.top - pan.y) / zoom
      return { x, y }
    },
    [pan.x, pan.y, zoom],
  )

  function onPointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      const dx = pts[0]!.x - pts[1]!.x
      const dy = pts[0]!.y - pts[1]!.y
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom }
    }
    if (e.button === 1 || e.altKey) {
      panDragRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y }
      return
    }
    const { x, y } = toDesignCoords(e.clientX, e.clientY)
    const hit = hitTestLayer(design.layers, x, y)
    if (!hit || hit.locked) {
      onSelect(null, false)
      return
    }
    onSelect(hit.id, e.shiftKey)
    dragRef.current = { layerId: hit.id, startX: e.clientX, startY: e.clientY, originX: hit.x, originY: hit.y }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()]
      const dx = pts[0]!.x - pts[1]!.x
      const dy = pts[0]!.y - pts[1]!.y
      const dist = Math.hypot(dx, dy)
      const ratio = dist / pinchRef.current.dist
      setZoom(Math.min(1.2, Math.max(0.15, pinchRef.current.zoom * ratio)))
      return
    }
    if (panDragRef.current) {
      const d = panDragRef.current
      setPan({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) })
      return
    }
    const drag = dragRef.current
    if (!drag) return
    const layer = design.layers.find((l) => l.id === drag.layerId)
    if (!layer || layer.locked) return
    const dx = (e.clientX - drag.startX) / zoom
    const dy = (e.clientY - drag.startY) / zoom
    let nextX = drag.originX + dx
    let nextY = drag.originY + dy
    const others = design.layers
      .filter((l) => l.id !== layer.id && !l.hidden)
      .map((l) => ({ x: l.x + l.width / 2, y: l.y + l.height / 2 }))
    const snapped = snapRectCenter(
      nextX + layer.width / 2,
      nextY + layer.height / 2,
      COVER_DESIGN_WIDTH,
      COVER_DESIGN_HEIGHT,
      others,
    )
    nextX = snapped.x - layer.width / 2
    nextY = snapped.y - layer.height / 2
    setActiveGuides(snapped.guides)
    onMoveLayer(layer.id, nextX, nextY)
  }

  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    dragRef.current = null
    panDragRef.current = null
    setActiveGuides([])
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedIds.length) return
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const layer = design.layers.find((l) => l.id === selectedIds[0])
      if (!layer || layer.locked) return
      const nudged = nudgePosition(layer.x, layer.y, e.key, e.shiftKey)
      onMoveLayer(layer.id, nudged.x, nudged.y)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [design.layers, onMoveLayer, selectedIds])

  return (
    <div className="flex flex-col gap-2" data-testid="cover-studio-canvas">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.15, z - 0.05))}
          className={`min-h-10 min-w-10 rounded-xl border border-line text-sm ${focusRing}`}
        >
          −
        </button>
        <span className="text-sm text-muted">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(1.2, z + 0.05))}
          className={`min-h-10 min-w-10 rounded-xl border border-line text-sm ${focusRing}`}
        >
          +
        </button>
        <button type="button" onClick={() => setPan({ x: 0, y: 0 })} className={`min-h-10 rounded-xl border border-line px-3 text-sm ${focusRing}`}>
          Reset view
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative h-[min(70vh,720px)] w-full overflow-hidden rounded-2xl border border-line bg-[#1a100a]/5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={(e) => onPointerUp(e)}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          e.preventDefault()
          setZoom((z) => Math.min(1.2, Math.max(0.15, z - e.deltaY * 0.001)))
        }}
        role="application"
        aria-label="Cover canvas"
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <canvas ref={canvasRef} width={COVER_DESIGN_WIDTH} height={COVER_DESIGN_HEIGHT} className="block shadow-lg" />
          {showGrid ? (
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,90,60,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,90,60,0.35) 1px, transparent 1px)',
                backgroundSize: `${COVER_GRID_STEP}px ${COVER_GRID_STEP}px`,
              }}
              aria-hidden
            />
          ) : null}
          {showSafeArea ? (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-coral/80"
              style={{
                left: COVER_SAFE_INSET,
                top: COVER_SAFE_INSET,
                width: COVER_DESIGN_WIDTH - COVER_SAFE_INSET * 2,
                height: COVER_DESIGN_HEIGHT - COVER_SAFE_INSET * 2,
              }}
              aria-hidden
            />
          ) : null}
          {design.layers.map((layer) => {
            if (layer.hidden || !selectedIds.includes(layer.id)) return null
            return (
              <div
                key={layer.id}
                className="pointer-events-none absolute border-2 border-coral"
                style={{
                  left: layer.x,
                  top: layer.y,
                  width: layer.width,
                  height: layer.height,
                  transform: `rotate(${layer.rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                aria-hidden
              />
            )
          })}
          {[...activeGuides, ...extraGuides].map((guide, index) =>
            guide.orientation === 'v' ? (
              <div
                key={`v-${guide.position}-${index}`}
                data-testid="cover-snap-guide-v"
                className="pointer-events-none absolute bottom-0 top-0 w-0.5 bg-coral"
                style={{ left: guide.position }}
                aria-hidden
              />
            ) : (
              <div
                key={`h-${guide.position}-${index}`}
                data-testid="cover-snap-guide-h"
                className="pointer-events-none absolute left-0 right-0 h-0.5 bg-coral"
                style={{ top: guide.position }}
                aria-hidden
              />
            ),
          )}
        </div>
      </div>
    </div>
  )
}
