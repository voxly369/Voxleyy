import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { VerifiedBadge } from '../components/profile/VerifiedBadge.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { deleteCreation, getCreationById, unpublishCreation } from '../lib/creations/api.ts'
import type { CreationDetail } from '../lib/creations/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function CreationPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [work, setWork] = useState<CreationDetail | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const title = work?.title?.trim() || work?.caption?.trim() || 'Work'
  useDocumentTitle(title)

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await getCreationById(id)
      if (!active) return
      if (!result.ok) {
        setWork(null)
        setProblem(result.error.message)
        return
      }
      setProblem(null)
      setWork(result.data)
    })()
    return () => {
      active = false
    }
  }, [id, attempt])

  if (!work && !problem) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-8">
        <Skeleton />
        <Skeleton variant="text-lines" lines={6} />
      </div>
    )
  }

  if (!work) {
    return (
      <ErrorState
        title="Work did not load"
        message={problem ?? 'We could not load this work. Try again.'}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  async function onUnpublish() {
    if (!work) return
    setActionError(null)
    setBusy(true)
    const result = await unpublishCreation(work.id)
    setBusy(false)
    if (!result.ok) {
      setActionError(result.error.message)
      return
    }
    setAttempt((n) => n + 1)
  }

  async function onDelete() {
    if (!work) return
    const ok = window.confirm(
      'Delete this work permanently? This cannot be undone. To hide it from readers instead, move it back to draft.',
    )
    if (!ok) return
    setActionError(null)
    setBusy(true)
    const result = await deleteCreation(work.id)
    setBusy(false)
    if (!result.ok) {
      setActionError(result.error.message)
      return
    }
    navigate(`/u/${work.author.username}`)
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      {work.coverUrl ? (
        <ImageWithFallback
          src={work.coverUrl}
          alt=""
          label={title.charAt(0)}
          className="aspect-[3/2] w-full max-w-xl rounded-lg"
        />
      ) : null}
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        <Link to={`/u/${work.author.username}`} className={`inline-flex items-center gap-2 text-base text-ink ${focusRing}`}>
          <ImageWithFallback
            src={work.author.avatarUrl ?? undefined}
            alt=""
            label={work.author.displayName || work.author.username}
            className="size-10"
          />
          <span>{work.author.displayName || work.author.username}</span>
          {work.author.verified ? <VerifiedBadge /> : null}
        </Link>
      </header>
      {work.bodyText ? (
        <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink">{work.bodyText}</div>
      ) : (
        <p className="text-muted">No text yet.</p>
      )}
      {work.isOwn ? (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {actionError ? <p className="text-sm text-coral">{actionError}</p> : null}
          {work.status === 'published' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onUnpublish()}
              className={`min-h-11 rounded-md bg-raised px-4 text-base font-medium text-ink ${focusRing}`}
            >
              Move back to draft
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            className={`min-h-11 rounded-md border border-line px-4 text-base font-medium text-muted ${focusRing}`}
          >
            Delete permanently
          </button>
          <p className="text-sm text-muted">
            Prefer moving back to draft when you only want to hide this work. Deletion is permanent.
          </p>
        </div>
      ) : null}
    </article>
  )
}
