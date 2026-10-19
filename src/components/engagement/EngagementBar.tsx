import { useReducer, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { toggleLike } from '../../lib/engagement/toggleLike.ts'
import { toggleSave } from '../../lib/engagement/toggleSave.ts'

type EngagementBarProps = {
  creationId: string
  likeCount: number
  commentCount: number
  saveCount: number
  liked: boolean
  saved: boolean
  onCommentClick: () => void
  className?: string
  onCountsChange?: (patch: {
    likeCount?: number
    commentCount?: number
    saveCount?: number
    liked?: boolean
    saved?: boolean
  }) => void
}

export function EngagementBar({
  creationId,
  likeCount,
  commentCount,
  saveCount,
  liked,
  saved,
  onCommentClick,
  onCountsChange,
  className = '',
}: EngagementBarProps) {
  const [busy, setBusy] = useReducer((_s: 'like' | 'save' | null, v: 'like' | 'save' | null) => v, null)
  const [likePulse, setLikePulse] = useState(false)
  const [savePulse, setSavePulse] = useState(false)

  async function onLike() {
    if (busy) return
    setBusy('like')
    const nextLiked = !liked
    const nextCount = likeCount + (nextLiked ? 1 : -1)
    onCountsChange?.({ liked: nextLiked, likeCount: Math.max(0, nextCount) })
    setLikePulse(true)
    window.setTimeout(() => setLikePulse(false), 200)
    const result = await toggleLike(creationId, liked)
    setBusy(null)
    if (!result.ok) {
      onCountsChange?.({ liked, likeCount })
      return
    }
    onCountsChange?.({
      liked: result.liked,
      likeCount: Math.max(0, likeCount + result.likeCountDelta),
    })
  }

  async function onSave() {
    if (busy) return
    setBusy('save')
    const nextSaved = !saved
    const nextCount = saveCount + (nextSaved ? 1 : -1)
    onCountsChange?.({ saved: nextSaved, saveCount: Math.max(0, nextCount) })
    setSavePulse(true)
    window.setTimeout(() => setSavePulse(false), 200)
    const result = await toggleSave(creationId, saved)
    setBusy(null)
    if (!result.ok) {
      onCountsChange?.({ saved, saveCount })
      return
    }
    onCountsChange?.({
      saved: result.saved,
      saveCount: Math.max(0, saveCount + result.saveCountDelta),
    })
  }

  return (
    <div className={`flex items-center gap-2 border-t border-line pt-3 ${className}`.trim()}>
      <button
        type="button"
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        disabled={busy === 'like'}
        onClick={() => void onLike()}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-2xl px-3 text-sm font-medium transition motion-reduce:transition-none ${
          liked ? 'text-coral' : 'text-muted'
        } ${likePulse ? 'scale-95 motion-reduce:scale-100' : ''} ${focusRing}`}
      >
        <span aria-hidden>♥</span>
        <span>{likeCount}</span>
      </button>
      <button
        type="button"
        aria-label="Comments"
        onClick={onCommentClick}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-2xl px-3 text-sm font-medium text-muted ${focusRing}`}
      >
        <span aria-hidden>💬</span>
        <span>{commentCount}</span>
      </button>
      <button
        type="button"
        aria-label={saved ? 'Unsave' : 'Save'}
        aria-pressed={saved}
        disabled={busy === 'save'}
        onClick={() => void onSave()}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-2xl px-3 text-sm font-medium transition motion-reduce:transition-none ${
          saved ? 'text-coral' : 'text-muted'
        } ${savePulse ? 'scale-95 motion-reduce:scale-100' : ''} ${focusRing}`}
      >
        <span aria-hidden>🔖</span>
        <span>{saveCount}</span>
      </button>
    </div>
  )
}
