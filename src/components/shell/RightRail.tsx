import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth/auth-context.ts'
import {
  fetchRecentOwnDrafts,
  fetchSuggestedWriters,
  type SuggestedWriter,
} from '../../lib/shell/rightRailData.ts'
import type { DraftListRow } from '../../lib/creations/types.ts'
import { creationTypeLabel } from '../../lib/creations/creationTypeLabel.ts'
import { FollowButton } from '../profile/FollowButton.tsx'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { Skeleton } from '../states/Skeleton.tsx'
import { focusRing } from './navItems.ts'

type SectionState<T> =
  | { phase: 'loading' }
  | { phase: 'ready'; data: T }
  | { phase: 'empty' }
  | { phase: 'error'; message: string }

export function RightRail() {
  const { profile } = useAuth()
  const [writers, setWriters] = useState<SectionState<SuggestedWriter[]>>({ phase: 'loading' })
  const [drafts, setDrafts] = useState<SectionState<DraftListRow[]>>({ phase: 'loading' })
  const [writerAttempt, setWriterAttempt] = useState(0)
  const [draftAttempt, setDraftAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      setWriters({ phase: 'loading' })
      const result = await fetchSuggestedWriters()
      if (!active) return
      if (!result.ok) {
        setWriters({ phase: 'error', message: result.message })
        return
      }
      if (result.writers.length === 0) {
        setWriters({ phase: 'empty' })
        return
      }
      setWriters({ phase: 'ready', data: result.writers })
    })()
    return () => {
      active = false
    }
  }, [writerAttempt])

  useEffect(() => {
    let active = true
    void (async () => {
      setDrafts({ phase: 'loading' })
      const result = await fetchRecentOwnDrafts()
      if (!active) return
      if (!result.ok) {
        setDrafts({ phase: 'error', message: result.message })
        return
      }
      if (result.drafts.length === 0) {
        setDrafts({ phase: 'empty' })
        return
      }
      setDrafts({ phase: 'ready', data: result.drafts })
    })()
    return () => {
      active = false
    }
  }, [draftAttempt])

  const draftsUsername = profile?.username ?? ''

  return (
    <aside aria-label="Suggestions" className="flex w-full max-w-[20rem] flex-col gap-6">
      <section aria-labelledby="rail-writers-heading" className="rounded-2xl border border-line bg-surface p-4">
        <h2 id="rail-writers-heading" className="font-serif text-lg text-ink">
          Writers to follow
        </h2>
        {writers.phase === 'loading' ? (
          <div className="mt-3 flex flex-col gap-2">
            <Skeleton variant="text-lines" lines={3} />
          </div>
        ) : writers.phase === 'error' ? (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <p className="text-muted">{writers.message}</p>
            <button
              type="button"
              onClick={() => setWriterAttempt((n) => n + 1)}
              className={`min-h-11 self-start rounded-2xl border border-line px-3 font-medium ${focusRing}`}
            >
              Retry
            </button>
          </div>
        ) : writers.phase === 'empty' ? (
          <p className="mt-3 text-sm text-muted">No suggestions right now.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {writers.data.map((writer) => (
              <WriterRow key={writer.id} writer={writer} />
            ))}
          </ul>
        )}
      </section>

      {drafts.phase !== 'empty' ? (
        <section aria-labelledby="rail-drafts-heading" className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="rail-drafts-heading" className="font-serif text-lg text-ink">
              Your drafts
            </h2>
            {draftsUsername ? (
              <Link
                to={`/u/${draftsUsername}?tab=drafts`}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-sm font-medium text-coral ${focusRing}`}
              >
                See all
              </Link>
            ) : null}
          </div>
          {drafts.phase === 'loading' ? (
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton variant="text-lines" lines={2} />
            </div>
          ) : drafts.phase === 'error' ? (
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <p className="text-muted">{drafts.message}</p>
              <button
                type="button"
                onClick={() => setDraftAttempt((n) => n + 1)}
                className={`min-h-11 self-start rounded-2xl border border-line px-3 font-medium ${focusRing}`}
              >
                Retry
              </button>
            </div>
          ) : drafts.phase === 'ready' ? (
            <ul className="mt-3 flex flex-col gap-2">
              {drafts.data.map((draft) => (
                <li key={draft.id}>
                  <Link
                    to={`/create/${draft.id}`}
                    className={`block rounded-xl border border-line px-3 py-2 text-sm supports-hover:bg-raised/60 ${focusRing}`}
                  >
                    <span className="font-medium text-ink">{draft.title?.trim() || 'Untitled draft'}</span>
                    <span className="mt-1 block text-xs text-muted">{creationTypeLabel(draft.type)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}

function WriterRow({ writer }: { writer: SuggestedWriter }) {
  const [following, setFollowing] = useState(false)
  return (
    <li className="flex items-center gap-3">
      <Link
        to={`/u/${writer.username}`}
        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 ${focusRing}`}
      >
        <ImageWithFallback
          src={writer.avatarUrl ?? undefined}
          alt=""
          label={writer.displayName}
          className="!size-10 shrink-0"
        />
        <span className="truncate font-medium text-ink">{writer.displayName}</span>
      </Link>
      <FollowButton
        userId={writer.id}
        username={writer.username}
        following={following}
        onChange={setFollowing}
      />
    </li>
  )
}
