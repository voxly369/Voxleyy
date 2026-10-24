import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import { truncateConversationPreview } from '../../lib/messages/previewTruncate.ts'
import { filterConversations } from '../../lib/messages/searchFilter.ts'
import type { ConversationSummary } from '../../lib/messages/types.ts'
import { LocalTime } from '../time/LocalTime.tsx'

type ConversationListProps = {
  rows: ConversationSummary[]
  activeId: string | null
  search: string
  onSearchChange: (value: string) => void
  loading?: boolean
  error?: string | null
  hasMore?: boolean
  onLoadMore?: () => void
}

function relativeTime(iso: string): string {
  const at = new Date(iso).getTime()
  if (Number.isNaN(at)) return ''
  const diff = Date.now() - at
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString()
}

export function ConversationList({
  rows,
  activeId,
  search,
  onSearchChange,
  loading = false,
  error = null,
  hasMore = false,
  onLoadMore,
}: ConversationListProps) {
  const filtered = filterConversations(rows, search)

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversation-list">
      <div className="border-b border-line p-3">
        <label htmlFor="conversation-search" className="sr-only">
          Search conversations
        </label>
        <input
          id="conversation-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search messages"
          className={`min-h-11 w-full rounded-2xl border border-line bg-bg px-3 text-base ${focusRing}`}
          data-testid="conversation-search"
        />
      </div>
      {error ? (
        <p role="alert" className="p-3 text-sm text-coral" data-testid="conversation-list-error">
          {error}
        </p>
      ) : null}
      {loading && rows.length === 0 ? <p className="p-3 text-sm text-muted">Loading…</p> : null}
      {!loading && filtered.length === 0 ? (
        <p className="p-3 text-sm text-muted" data-testid="conversation-list-empty">
          {search.trim() ? 'No conversations match your search.' : 'No messages yet.'}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((row) => {
            const name = row.otherDisplayName || row.otherUsername
            const active = row.conversationId === activeId
            return (
              <li key={row.conversationId}>
                <Link
                  to={`/messages/${row.conversationId}`}
                  data-testid="conversation-row"
                  aria-current={active ? 'true' : undefined}
                  className={`flex min-h-[4.5rem] gap-3 border-b border-line px-3 py-2 ${active ? 'bg-raised' : ''} ${focusRing}`}
                >
                  <ImageWithFallback
                    src={row.otherAvatarUrl ?? undefined}
                    alt=""
                    label={name.charAt(0)}
                    className="size-12 shrink-0 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-medium text-ink">{name}</p>
                      <span className="shrink-0 text-xs text-muted">{relativeTime(row.lastActivityAt)}</span>
                    </div>
                    <p className="truncate text-sm text-muted">@{row.otherUsername}</p>
                    {row.otherShowLocalTime ? (
                      <LocalTime timezone={row.otherTimezone} className="text-xs text-muted" />
                    ) : null}
                    <p className="truncate text-sm text-ink">
                      {truncateConversationPreview(row.preview) || 'No messages yet'}
                    </p>
                  </div>
                  {row.unreadCount > 0 ? (
                    <span
                      className="mt-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-4 text-white"
                      data-testid="conversation-unread-badge"
                    >
                      {row.unreadCount > 99 ? '99+' : row.unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {hasMore ? (
        <button
          type="button"
          onClick={() => onLoadMore?.()}
          className={`m-3 min-h-11 rounded-2xl border border-line text-base font-medium text-ink ${focusRing}`}
        >
          Load more
        </button>
      ) : null}
    </div>
  )
}
