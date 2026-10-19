import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { VerifiedBadge } from '../components/profile/VerifiedBadge.tsx'
import { PublishSheet } from '../components/creations/PublishSheet.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { ConfirmDialog } from '../components/states/ConfirmDialog.tsx'
import { ErrorState } from '../components/states/ErrorState.tsx'
import { ImageWithFallback } from '../components/states/ImageWithFallback.tsx'
import { Skeleton } from '../components/states/Skeleton.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import { audienceLabel } from '../lib/creations/audienceOptions.ts'
import {
  deleteCreation,
  fetchProfileRole,
  getCreationById,
  publishCreation,
  unpublishCreation,
} from '../lib/creations/api.ts'
import { becameWriterAfterPublish } from '../lib/creations/roleChange.ts'
import type { CreationDetail } from '../lib/creations/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'
import { EngagementBar } from '../components/engagement/EngagementBar.tsx'
import { CommentsSheet } from '../components/engagement/CommentsSheet.tsx'
import { RichTextView } from '../components/creations/RichTextView.tsx'
import { quoteStyleFromJson } from '../lib/creations/bodyDocument.ts'
import { QuoteCardView } from '../components/creations/QuoteCardView.tsx'
import { supabase } from '../lib/supabaseClient.ts'

type LocationState = {
  published?: boolean
  writerPromoted?: boolean
}

export default function CreationPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [work, setWork] = useState<CreationDetail | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [saveCount, setSaveCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const navFlash = location.state as LocationState | null
  const publishedNotice = navFlash?.published ? 'Published' : null
  const writerNotice = Boolean(navFlash?.writerPromoted)

  const title = work?.title?.trim() || work?.caption?.trim() || 'Work'
  useDocumentTitle(title)

  useEffect(() => {
    if (location.state) window.history.replaceState({}, document.title)
  }, [location.state])

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
      if (result.data.status === 'published') {
        const { data: counts } = await supabase
          .from('creations')
          .select('like_count, comment_count, save_count')
          .eq('id', result.data.id)
          .maybeSingle()
        if (active && counts) {
          setLikeCount(counts.like_count ?? 0)
          setCommentCount(counts.comment_count ?? 0)
          setSaveCount(counts.save_count ?? 0)
        }
        const session = await supabase.auth.getSession()
        const uid = session.data.session?.user.id
        if (active && uid) {
          const [likeRow, saveRow] = await Promise.all([
            supabase.from('likes').select('creation_id').eq('user_id', uid).eq('creation_id', result.data.id).maybeSingle(),
            supabase.from('saves').select('creation_id').eq('user_id', uid).eq('creation_id', result.data.id).maybeSingle(),
          ])
          setLiked(Boolean(likeRow.data))
          setSaved(Boolean(saveRow.data))
        }
      }
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

  async function onDeleteConfirmed() {
    if (!work) return
    setConfirmDelete(false)
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

  async function onPublishConfirm(audience: import('../lib/creations/types.ts').Audience) {
    if (!work) return
    setPublishError(null)
    setPublishBusy(true)
    const roleBefore = profile?.id ? await fetchProfileRole(profile.id) : null
    const beforeRole = roleBefore?.ok ? roleBefore.data : null

    const result = await publishCreation({
      id: work.id,
      audience,
      expectedUpdatedAt: work.updatedAt,
    })
    setPublishBusy(false)

    if (!result.ok) {
      if ('conflict' in result) {
        setPublishError('Someone else saved a newer version. Reload and try again.')
        return
      }
      setPublishError(result.error.message)
      return
    }

    setPublishOpen(false)
    const roleAfter = profile?.id ? await fetchProfileRole(profile.id) : null
    const afterRole = roleAfter?.ok ? roleAfter.data : null
    setAttempt((n) => n + 1)
    navigate(`/c/${work.id}`, {
      replace: true,
      state: {
        published: true,
        writerPromoted: becameWriterAfterPublish(beforeRole, afterRole),
      },
    })
  }

  const engagement =
    work.status === 'published' ? (
      <EngagementBar
        creationId={work.id}
        likeCount={likeCount}
        commentCount={commentCount}
        saveCount={saveCount}
        liked={liked}
        saved={saved}
        onCommentClick={() => setCommentsOpen(true)}
        onCountsChange={(patch) => {
          if (patch.likeCount !== undefined) setLikeCount(patch.likeCount)
          if (patch.commentCount !== undefined) setCommentCount(patch.commentCount)
          if (patch.saveCount !== undefined) setSaveCount(patch.saveCount)
          if (patch.liked !== undefined) setLiked(patch.liked)
          if (patch.saved !== undefined) setSaved(patch.saved)
        }}
        className="xl:flex-col xl:border-t-0 xl:pt-0"
      />
    ) : null

  return (
    <PageContainer variant="reading" className="py-8">
    <article className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,65ch)_auto] xl:items-start xl:gap-8">
      {publishedNotice ? (
        <p className="rounded-2xl border border-line bg-raised px-4 py-2 text-sm font-medium text-ink" aria-live="polite">
          {publishedNotice}
        </p>
      ) : null}
      {writerNotice ? (
        <p className="rounded-2xl border border-line bg-raised px-4 py-2 text-sm text-ink" role="status">
          You are now a Writer on Voxly. Keep sharing your work.
        </p>
      ) : null}
      {work.coverUrl ? (
        <ImageWithFallback
          src={work.coverUrl}
          alt=""
          label={title.charAt(0)}
          className="aspect-[3/2] w-full max-w-xl rounded-lg"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-6 xl:col-start-1">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
        {work.isOwn ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="rounded-full bg-raised px-2 py-1 font-semibold uppercase tracking-wide">
              {work.status === 'published' ? 'Live' : 'Draft'}
            </span>
            {work.status === 'published' ? <span>Audience: {audienceLabel(work.audience)}</span> : null}
          </p>
        ) : null}
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
        {engagement ? <div className="xl:hidden">{engagement}</div> : null}
      </header>
      {work.type === 'quote_card' ? (
        work.bodyText ? (
          <QuoteCardView
            text={work.bodyText}
            style={quoteStyleFromJson(work.bodyJson)}
            handle={work.author.username}
          />
        ) : (
          <p className="text-muted">No text yet.</p>
        )
      ) : work.bodyText || work.bodyJson ? (
        <RichTextView bodyJson={work.bodyJson} bodyText={work.bodyText ?? ''} creationType={work.type} />
      ) : (
        <p className="text-muted">No text yet.</p>
      )}
      {work.isOwn ? (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {actionError ? <p className="text-sm text-coral">{actionError}</p> : null}
          <Link
            to={`/create/${work.id}`}
            className={`inline-flex min-h-11 items-center justify-center rounded-md bg-coral px-4 text-base font-semibold text-white ${focusRing}`}
          >
            Edit
          </Link>
          {work.status === 'draft' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setPublishOpen(true)}
              className={`min-h-11 rounded-md bg-raised px-4 text-base font-medium text-ink ${focusRing}`}
            >
              Publish
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setPublishOpen(true)}
              className={`min-h-11 rounded-md bg-raised px-4 text-base font-medium text-ink ${focusRing}`}
            >
              Update audience
            </button>
          )}
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
            onClick={() => setConfirmDelete(true)}
            className={`min-h-11 rounded-md border border-line px-4 text-base font-medium text-muted ${focusRing}`}
          >
            Delete permanently
          </button>
          <p className="text-sm text-muted">
            Prefer moving back to draft when you only want to hide this work. Deletion is permanent.
          </p>
        </div>
      ) : null}
      </div>
      {engagement ? (
        <aside className="hidden xl:col-start-2 xl:block xl:sticky xl:top-6">{engagement}</aside>
      ) : null}
      <PublishSheet
        open={publishOpen}
        onClose={() => {
          setPublishOpen(false)
          setPublishError(null)
        }}
        title={work.title ?? ''}
        body={work.bodyText ?? ''}
        caption={work.caption ?? ''}
        tags={[]}
        coverUrl={work.coverUrl}
        creationType={work.type}
        initialAudience={work.audience}
        mode={work.status === 'published' ? 'audience' : 'publish'}
        busy={publishBusy}
        error={publishError}
        onConfirm={(audience) => void onPublishConfirm(audience)}
      />
      {commentsOpen ? (
        <CommentsSheet open creationId={work.id} onClose={() => setCommentsOpen(false)} />
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this work permanently?"
        message="This cannot be undone. To hide it from readers instead, move it back to draft."
        confirmLabel="Delete permanently"
        cancelLabel="Keep it"
        onConfirm={() => void onDeleteConfirmed()}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
    </PageContainer>
  )
}
