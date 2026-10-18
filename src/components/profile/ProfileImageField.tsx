import { useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { prepareProfileImage } from '../../lib/profiles/imageProcess.ts'
import { clearProfileImage, saveProfileImage, type MediaBucket } from '../../lib/profiles/upload.ts'

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
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const inputId = `${bucket}-upload`
  const busy = preparing || progress !== null

  async function onFile(file: File | undefined) {
    if (!file || busy) return
    setError('')
    setPreparing(true)
    let prepared: Awaited<ReturnType<typeof prepareProfileImage>>
    try {
      prepared = await prepareProfileImage(file, bucket === 'avatars' ? 'avatar' : 'banner')
    } catch (caught) {
      setPreparing(false)
      setError(caught instanceof Error ? caught.message : 'We could not prepare that image.')
      return
    }
    setPreparing(false)
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
      <p className="text-sm font-medium text-ink" id={`${inputId}-label`}>
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
          htmlFor={inputId}
          className={`inline-flex min-h-11 cursor-pointer items-center rounded-2xl bg-ink px-4 text-sm font-semibold text-bg ${busy ? 'opacity-60' : ''} ${focusRing}`}
        >
          {busy ? 'Please wait…' : 'Upload'}
          <input
            id={inputId}
            aria-labelledby={`${inputId}-label`}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void onFile(file)
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
      {preparing ? (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          Preparing image…
        </p>
      ) : null}
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
        </p>
      ) : null}
    </div>
  )
}
