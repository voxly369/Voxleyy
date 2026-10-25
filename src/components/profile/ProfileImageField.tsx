import { useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import type { PreparedImage } from '../../lib/profiles/imageProcess.ts'
import { clearProfileImage, saveProfileImage, type MediaBucket } from '../../lib/profiles/upload.ts'
import { ProfileImageCropModal } from './ProfileImageCropModal.tsx'

type ProfileImageFieldProps = {
  bucket: MediaBucket
  userId: string
  label: string
  url: string | null
  fallbackLabel: string
  onChange: (url: string | null) => void
}

export function ProfileImageField({ bucket, userId, label, url, fallbackLabel, onChange }: ProfileImageFieldProps) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const galleryId = `${bucket}-gallery`
  const cameraId = `${bucket}-camera`
  const busy = progress !== null

  function pickFile(file: File | undefined) {
    if (!file || busy) return
    setError('')
    setCropFile(file)
    setCropOpen(true)
  }

  async function uploadPrepared(prepared: PreparedImage) {
    setProgress(0)
    const saved = await saveProfileImage({
      bucket,
      userId,
      blob: prepared.blob,
      previousUrl: url,
      onProgress: (ratio) => setProgress(Math.round(ratio * 100)),
    })
    setProgress(null)
    if (!saved.ok) {
      setError(saved.error.message)
      return
    }
    onChange(saved.data)
  }

  async function remove() {
    if (busy) return
    setError('')
    setProgress(0)
    const cleared = await clearProfileImage({ bucket, userId, previousUrl: url })
    setProgress(null)
    if (!cleared.ok) {
      setError(cleared.error.message)
      return
    }
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <ProfileImageCropModal
        open={cropOpen}
        file={cropFile}
        bucket={bucket}
        onClose={() => {
          setCropOpen(false)
          setCropFile(null)
        }}
        onPrepared={(prepared) => void uploadPrepared(prepared)}
      />
      <p className="text-sm font-medium text-ink" id={`${galleryId}-label`}>
        {label}
      </p>
      <ImageWithFallback
        src={url ?? undefined}
        alt=""
        label={fallbackLabel}
        className={bucket === 'banners' ? '!h-32 !w-full !rounded-2xl !size-auto' : '!size-24'}
      />
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={galleryId}
          className={`inline-flex min-h-11 cursor-pointer items-center rounded-2xl bg-ink px-4 text-sm font-semibold text-bg ${busy ? 'opacity-60' : ''} ${focusRing}`}
        >
          {busy ? 'Please wait…' : 'Choose from gallery'}
          <input
            id={galleryId}
            aria-labelledby={`${galleryId}-label`}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/*"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              pickFile(file)
            }}
          />
        </label>
        <label
          htmlFor={cameraId}
          className={`inline-flex min-h-11 cursor-pointer items-center rounded-2xl border border-line px-4 text-sm font-semibold text-ink ${busy ? 'opacity-60' : ''} ${focusRing}`}
        >
          Take photo
          <input
            id={cameraId}
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              pickFile(file)
            }}
          />
        </label>
        {url ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className={`inline-flex min-h-11 items-center rounded-2xl border border-line px-4 text-sm font-semibold text-ink disabled:opacity-60 ${focusRing}`}
          >
            Remove
          </button>
        ) : null}
      </div>
      {progress !== null ? (
        <div className="flex flex-col gap-1">
          <progress value={progress} max={100} className="h-2 w-full" aria-label={`${label} upload progress`}>
            {progress}%
          </progress>
          <p role="status" aria-live="polite" className="text-sm text-muted">
            {progress}%
          </p>
        </div>
      ) : null}
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-coral">
          {error}
          <button type="button" className={`ms-2 underline ${focusRing}`} onClick={() => setError('')}>
            Retry
          </button>
        </p>
      ) : null}
    </div>
  )
}
