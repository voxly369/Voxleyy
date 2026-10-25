import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { paintProfileImagePreview, prepareProfileImage, type PreparedImage } from '../../lib/profiles/imageProcess.ts'
import type { MediaBucket } from '../../lib/profiles/upload.ts'

type ProfileImageCropModalProps = {
  open: boolean
  file: File | null
  bucket: MediaBucket
  onClose: () => void
  onPrepared: (prepared: PreparedImage) => void
}

export function ProfileImageCropModal({ open, file, bucket, onClose, onPrepared }: ProfileImageCropModalProps) {
  const titleId = useId()
  const previewId = useId()
  const kind = bucket === 'avatars' ? 'avatar' : 'banner'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewError, setPreviewError] = useState('')

  const adjust = { zoom, offsetX, offsetY }

  useEffect(() => {
    if (!open) return
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setError('')
    setPreviewError('')
  }, [open, file])

  const repaint = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !file) return
    try {
      await paintProfileImagePreview(canvas, file, kind, adjust)
      setPreviewError('')
    } catch {
      setPreviewError('Preview unavailable for this file.')
    }
  }, [file, kind, zoom, offsetX, offsetY])

  useEffect(() => {
    if (!open || !file) return
    void repaint()
  }, [open, file, repaint])

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'touch' && event.isPrimary) {
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offsetX, oy: offsetY }
    } else if (event.pointerType === 'mouse' && event.button === 0) {
      dragRef.current = { x: event.clientX, y: event.clientY, ox: offsetX, oy: offsetY }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = (event.clientX - drag.x) / 120
    const dy = (event.clientY - drag.y) / 120
    setOffsetX(Math.min(1, Math.max(-1, drag.ox + dx)))
    setOffsetY(Math.min(1, Math.max(-1, drag.oy + dy)))
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null
    pinchRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
  }

  function onTouchMove(event: React.TouchEvent<HTMLCanvasElement>) {
    if (event.touches.length === 2) {
      event.preventDefault()
      const [a, b] = [event.touches[0]!, event.touches[1]!]
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      if (!pinchRef.current) {
        pinchRef.current = { distance, zoom }
        return
      }
      const ratio = distance / pinchRef.current.distance
      setZoom(Math.min(3, Math.max(1, pinchRef.current.zoom * ratio)))
    }
  }

  async function apply() {
    if (!file || busy) return
    setBusy(true)
    setError('')
    try {
      const prepared = await prepareProfileImage(file, kind, adjust)
      onPrepared(prepared)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not prepare that image.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-full max-w-lg">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <h2 id={titleId} className="font-serif text-xl text-ink">
          Adjust {kind === 'avatar' ? 'profile photo' : 'banner'}
        </h2>
        <p className="text-sm text-muted">
          Drag the preview to reposition, pinch or use sliders to zoom. We save a webp without location data.
        </p>
        <div className="flex justify-center rounded-2xl border border-line bg-bg p-3">
          <canvas
            ref={canvasRef}
            id={previewId}
            role="img"
            aria-label={`Live ${kind} crop preview`}
            data-testid="profile-crop-preview"
            className={`max-h-64 max-w-full touch-none ${kind === 'avatar' ? 'rounded-full' : 'rounded-xl'}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTouchMove={onTouchMove}
          />
        </div>
        {previewError ? (
          <p className="text-sm text-muted" role="status">
            {previewError}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-controls={previewId}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Horizontal</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.02}
            value={offsetX}
            onChange={(e) => setOffsetX(Number(e.target.value))}
            aria-controls={previewId}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Vertical</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.02}
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value))}
            aria-controls={previewId}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => void apply()}
            className={`min-h-11 rounded-2xl bg-coral px-4 text-sm font-semibold text-white ${focusRing}`}
          >
            {busy ? 'Preparing…' : 'Use this crop'}
          </button>
          <button type="button" onClick={onClose} className={`min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
