import { useEffect, useMemo, useState } from 'react'
import { focusRing } from '../shell/navItems.ts'
import { useToast } from '../../lib/shell/useToast.ts'
import type { PublishedWorkSummary } from '../../lib/creations/types.ts'
import { toggleSave } from '../../lib/engagement/toggleSave.ts'
import { savedCreationIdsForViewer } from '../../lib/engagement/savedCreationIds.ts'
import { ProfilePostTile } from './ProfilePostTile.tsx'

type ProfilePostsGridProps = {
  works: PublishedWorkSummary[]
  viewerId: string | null
  onLoadMore: () => void
  loadingMore: boolean
  hasMore: boolean
  loadMoreError: string | null
  onRetryLoadMore: () => void
}

export function ProfilePostsGrid({
  works,
  viewerId,
  onLoadMore,
  loadingMore,
  hasMore,
  loadMoreError,
  onRetryLoadMore,
}: ProfilePostsGridProps) {
  const { showToast } = useToast()
  const [saveBusy, setSaveBusy] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const workIds = useMemo(() => works.map((w) => w.id).join(','), [works])

  useEffect(() => {
    if (!viewerId || works.length === 0) return
    let active = true
    void savedCreationIdsForViewer(works.map((w) => w.id)).then((set) => {
      if (active) setSavedIds(set)
    })
    return () => {
      active = false
    }
  }, [viewerId, workIds, works])

  const savedForTiles = viewerId ? savedIds : new Set<string>()

  async function onToggleSave(workId: string, currentlySaved: boolean) {
    if (!viewerId) return
    setSaveBusy(workId)
    const result = await toggleSave(workId, currentlySaved)
    setSaveBusy(null)
    if (!result.ok) {
      showToast(result.error.message)
      return
    }
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (result.saved) next.add(workId)
      else next.delete(workId)
      return next
    })
    if (result.saved) {
      showToast('Saved to your Library', {
        label: 'Undo',
        onClick: () => void onToggleSave(workId, true),
      })
    } else {
      showToast('Removed from your Library')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {works.map((work) => (
          <li key={work.id}>
            <ProfilePostTile
              work={work}
              saved={savedForTiles.has(work.id)}
              saveBusy={saveBusy === work.id}
              onToggleSave={onToggleSave}
            />
          </li>
        ))}
      </ul>
      {loadMoreError ? (
        <button type="button" onClick={onRetryLoadMore} className={`text-sm text-coral ${focusRing}`}>
          {loadMoreError} — Try again
        </button>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={onLoadMore}
          className={`min-h-11 self-center rounded-2xl border border-line px-4 text-base font-medium ${focusRing}`}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}
