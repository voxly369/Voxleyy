import { useEffect, useId, useState } from 'react'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { ConfirmDialog } from '../states/ConfirmDialog.tsx'
import { EmptyState } from '../states/EmptyState.tsx'
import { ErrorState } from '../states/ErrorState.tsx'
import { Skeleton } from '../states/Skeleton.tsx'
import { useAuth } from '../../lib/auth/auth-context.ts'
import {
  deleteOwnComment,
  editOwnComment,
  listComments,
  postComment,
  replyToComment,
  type CommentCursor,
} from '../../lib/engagement/comments.ts'
import type { CommentNode } from '../../lib/engagement/commentTree.ts'
import { parseMentions } from '../../lib/engagement/mentions.ts'
import { supabase } from '../../lib/supabaseClient.ts'
import { MentionText } from './MentionText.tsx'
import { SafetyOverflowMenu } from '../safety/SafetyOverflowMenu.tsx'
import { listHiddenWords } from '../../lib/safety/hiddenWordsApi.ts'
import { hiddenWordMatch } from '../../lib/safety/hiddenWordMatch.ts'
import { useMediaQuery, DESKTOP_NAV_QUERY } from '../../lib/shell/useMediaQuery.ts'

type CommentsSheetProps = {
  open: boolean
  creationId: string
  onClose: () => void
}

export function CommentsSheet({ open, creationId, onClose }: CommentsSheetProps) {
  const dockRight = useMediaQuery(DESKTOP_NAV_QUERY)
  const titleId = useId()
  const { profile, user, isFounder } = useAuth()
  const [comments, setComments] = useState<CommentNode[]>([])
  const [cursor, setCursor] = useState<CommentCursor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [composer, setComposer] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [knownMentions, setKnownMentions] = useState<Set<string>>(new Set())
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [hiddenWords, setHiddenWords] = useState<string[]>([])
  const [revealedCommentIds, setRevealedCommentIds] = useState<Set<string>>(() => new Set())

  const accountBlocked =
    profile?.status === 'suspended' || profile?.status === 'banned'
  const composerDisabledMessage =
    profile?.status === 'banned'
      ? 'Your account cannot comment.'
      : profile?.status === 'suspended'
        ? 'Your account is suspended and cannot comment.'
        : null

  useEffect(() => {
    if (!open) return
    let active = true
    void listHiddenWords().then((result) => {
      if (!active || !result.ok) return
      setHiddenWords(result.data.map((row) => row.word))
    })
    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let active = true
    void (async () => {
      const result = await listComments(creationId, null, { viewerIsFounder: isFounder })
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setError(null)
      setComments(result.data.comments)
      setCursor(result.data.nextCursor)
    })()
    return () => {
      active = false
    }
  }, [open, creationId, isFounder])

  async function refreshMentions(text: string) {
    const usernames = parseMentions(text)
    if (usernames.length === 0) {
      setKnownMentions(new Set())
      return
    }
    const { data } = await supabase.from('profiles_public').select('username').in('username', usernames)
    setKnownMentions(
      new Set((data ?? []).flatMap((row) => (row.username ? [row.username.toLowerCase()] : []))),
    )
  }

  async function submitComposer() {
    if (accountBlocked || !composer.trim()) return
    setBusy(true)
    const body = composer.trim()
    const result = replyTo
      ? await replyToComment(creationId, replyTo, body)
      : await postComment(creationId, body)
    setBusy(false)
    if ('error' in result) {
      setError(result.error.message)
      return
    }
    setComposer('')
    setReplyTo(null)
    const reload = await listComments(creationId, null, { viewerIsFounder: isFounder })
    if (reload.ok) {
      setComments(reload.data.comments)
      setCursor(reload.data.nextCursor)
    }
  }

  async function loadMore() {
    if (!cursor) return
    setBusy(true)
    const result = await listComments(creationId, cursor, { viewerIsFounder: isFounder })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setComments((prev) => [...prev, ...result.data.comments])
    setCursor(result.data.nextCursor)
  }

  return (
    <>
      <Modal
        open={open !== false}
        onClose={onClose}
        labelledBy={titleId}
        containerClassName={
          dockRight
            ? 'fixed inset-0 flex justify-end p-0'
            : 'fixed inset-0 flex items-end justify-center p-0 sm:p-4'
        }
        backdropClassName="absolute inset-0 bg-black/50"
        backdropLabel="Close comments"
        className={
          dockRight
            ? 'relative z-10 flex h-full w-[26rem] max-w-full flex-col border-l border-line bg-surface shadow-xl'
            : 'relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl'
        }
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={titleId} className="font-serif text-xl text-ink">
            Comments
          </h2>
          <button type="button" onClick={onClose} className={`min-h-11 rounded-2xl px-3 text-sm font-medium ${focusRing}`}>
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton />
              <Skeleton />
            </div>
          ) : error ? (
            <ErrorState title="Comments did not load" message={error} onRetry={() => setError(null)} />
          ) : comments.length === 0 ? (
            <EmptyState title="No comments yet" message="Start the conversation." />
          ) : (
            <ul className="flex flex-col gap-4">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl border border-line p-3">
                  <CommentRow
                    node={comment}
                    creationId={creationId}
                    viewerId={user?.id ?? null}
                    knownMentions={knownMentions}
                    hiddenWords={hiddenWords}
                    revealed={revealedCommentIds.has(comment.id)}
                    onReveal={() =>
                      setRevealedCommentIds((prev) => {
                        const next = new Set(prev)
                        next.add(comment.id)
                        return next
                      })
                    }
                    onReply={() => setReplyTo(comment.id)}
                    onEdit={() => {
                      setEditId(comment.id)
                      setComposer(comment.body)
                    }}
                    onDelete={() => setConfirmDeleteId(comment.id)}
                  />
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="ml-4 mt-3 border-l border-line pl-3">
                      <CommentRow
                        node={reply}
                        creationId={creationId}
                        viewerId={user?.id ?? null}
                        knownMentions={knownMentions}
                        hiddenWords={hiddenWords}
                        revealed={revealedCommentIds.has(reply.id)}
                        onReveal={() =>
                          setRevealedCommentIds((prev) => {
                            const next = new Set(prev)
                            next.add(reply.id)
                            return next
                          })
                        }
                        onReply={() => setReplyTo(reply.id)}
                        onEdit={() => {
                          setEditId(reply.id)
                          setComposer(reply.body)
                        }}
                        onDelete={() => setConfirmDeleteId(reply.id)}
                      />
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {cursor ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadMore()}
              className={`mt-4 min-h-11 w-full rounded-2xl border border-line px-4 text-sm font-medium ${focusRing}`}
            >
              Load more
            </button>
          ) : null}
        </div>

        <footer className="border-t border-line p-4">
          {replyTo ? (
            <p className="mb-2 text-xs text-muted">
              Replying
              <button
                type="button"
                className={`ml-2 inline-flex min-h-11 items-center px-2 text-sm text-coral ${focusRing}`}
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </p>
          ) : null}
          {composerDisabledMessage ? (
            <p className="mb-2 text-sm text-muted" role="status" data-testid="comments-composer-disabled">
              {composerDisabledMessage}
            </p>
          ) : null}
          <textarea
            value={composer}
            maxLength={2000}
            disabled={accountBlocked || busy}
            onChange={(event) => {
              setComposer(event.target.value)
              void refreshMentions(event.target.value)
            }}
            placeholder="Add a comment"
            className="min-h-24 w-full rounded-2xl border border-line bg-bg px-3 py-2 text-sm text-ink"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{composer.length}/2000</span>
            <button
              type="button"
              disabled={accountBlocked || busy || !composer.trim()}
              onClick={() => {
                if (editId) {
                  void (async () => {
                    setBusy(true)
                    const result = await editOwnComment(editId, composer)
                    setBusy(false)
                    if (!result.ok) {
                      setError(result.error.message)
                      return
                    }
                    setEditId(null)
                    setComposer('')
                    const reload = await listComments(creationId, null, { viewerIsFounder: isFounder })
                    if (reload.ok) setComments(reload.data.comments)
                  })()
                  return
                }
                void submitComposer()
              }}
              className={`min-h-11 rounded-2xl bg-coral px-4 text-sm font-semibold text-white disabled:opacity-50 ${focusRing}`}
            >
              {editId ? 'Save' : replyTo ? 'Reply' : 'Post'}
            </button>
          </div>
        </footer>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete comment?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          const id = confirmDeleteId
          setConfirmDeleteId(null)
          if (!id) return
          void (async () => {
            const result = await deleteOwnComment(id)
            if (!result.ok) {
              setError(result.error.message)
              return
            }
            const reload = await listComments(creationId, null, { viewerIsFounder: isFounder })
            if (reload.ok) setComments(reload.data.comments)
          })()
        }}
      />
    </>
  )
}

function CommentRow({
  node,
  creationId: _creationId,
  viewerId,
  knownMentions,
  hiddenWords,
  revealed,
  onReveal,
  onReply,
  onEdit,
  onDelete,
}: {
  node: CommentNode
  creationId: string
  viewerId: string | null
  knownMentions: ReadonlySet<string>
  hiddenWords: readonly string[]
  revealed: boolean
  onReveal: () => void
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const own = viewerId === node.author.id
  const unavailable = node.author.unavailable === true
  const hiddenByWord = !own && hiddenWordMatch(node.body, hiddenWords) && !revealed
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium text-muted">
        {unavailable ? (
          node.author.displayName
        ) : (
          <>
            {node.author.displayName || node.author.username}
            {node.author.verified ? ' ✓' : ''}
          </>
        )}
      </p>
      {!own && !unavailable ? (
        <SafetyOverflowMenu
          testId={`comment-safety-${node.id}`}
          subject={{
            reportedUserId: node.author.id,
            displayLabel: node.author.displayName || node.author.username,
            report: {
              targetType: 'comment',
              targetId: node.id,
              reportedUserId: node.author.id,
              label: 'comment',
            },
          }}
        />
      ) : null}
      </div>
      {hiddenByWord ? (
        <button
          type="button"
          data-testid={`hidden-comment-${node.id}`}
          onClick={onReveal}
          className={`mt-1 text-sm text-muted underline ${focusRing}`}
        >
          Hidden comment, show
        </button>
      ) : node.body ? (
        <MentionText text={node.body} knownUsernames={knownMentions} />
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReply}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs font-medium text-coral ${focusRing}`}
        >
          Reply
        </button>
        {own ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs font-medium text-muted ${focusRing}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs font-medium text-muted ${focusRing}`}
            >
              Delete
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
