import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { prepareProfileImage, type PreparedImage } from '../../lib/profiles/imageProcess.ts'
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
  const kind = bucket === 'avatars' ? 'avatar' : 'banner'
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setError('')
  }, [open, file])

  async function apply() {
    if (!file || busy) return
    setBusy(true)
    setError('')
    try {
      const prepared = await prepareProfileImage(file, kind, { zoom, offsetX, offsetY })
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
        <p className="text-sm text-muted">Drag sliders to zoom and reposition. We save a webp without location data.</p>
        <label className="flex flex-col gap-1 text-sm">
          <span>Zoom</span>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Horizontal</span>
          <input type="range" min={-1} max={1} step={0.02} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Vertical</span>
          <input type="range" min={-1} max={1} step={0.02} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-coral">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !file} onClick={() => void apply()} className={`min-h-11 rounded-2xl bg-coral px-4 text-sm font-semibold text-white ${focusRing}`}>
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
