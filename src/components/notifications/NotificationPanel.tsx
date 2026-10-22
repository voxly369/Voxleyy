import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../shell/Modal.tsx'
import { focusRing } from '../shell/navItems.ts'
import { EmptyState } from '../states/EmptyState.tsx'
import {
  clearReadNotifications,
  fetchNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/notifications/api.ts'
import { groupNotifications } from '../../lib/notifications/groupNotifications.ts'
import { useNotifications } from '../../lib/notifications/useNotifications.ts'
import type { NotificationCursor, NotificationRow } from '../../lib/notifications/types.ts'
import { NotificationRow as NotificationRowView } from './NotificationRow.tsx'
import { useMediaQuery } from '../../lib/shell/useMediaQuery.ts'

type NotificationPanelProps = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function NotificationPanel({ open, onClose, anchorRef }: NotificationPanelProps) {
  const { refresh, unreadCount } = useNotifications()
  const mobileSheet = useMediaQuery('(max-width: 767px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const [anchorBox, setAnchorBox] = useState<{ top: number; left: number } | null>(null)
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [nextCursor, setNextCursor] = useState<NotificationCursor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (next: NotificationCursor | null, append: boolean) => {
    setLoading(true)
    setError(null)
    const result = await fetchNotificationFeed(next)
    setLoading(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows))
    setNextCursor(result.data.nextCursor)
  }, [])

  useEffect(() => {
    if (!open) return
    void load(null, false)
  }, [open, load])

  useEffect(() => {
    if (!open || mobileSheet) {
      setAnchorBox(null)
      return
    }
    const anchor = anchorRef.current
    if (!anchor) return
    const sync = () => {
      const rect = anchor.getBoundingClientRect()
      setAnchorBox({ top: rect.bottom + 8, left: Math.max(8, rect.left) })
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, mobileSheet, anchorRef])

  useEffect(() => {
    if (!open || mobileSheet) return
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, mobileSheet, onClose, anchorRef])

  async function onMarkAll() {
    setBusy(true)
    const result = await markAllNotificationsRead()
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRows((prev) => prev.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })))
    await refresh()
  }

  async function onClearRead() {
    setBusy(true)
    const result = await clearReadNotifications()
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRows((prev) => prev.filter((row) => !row.readAt))
    await refresh()
  }

  async function onRowNavigate(row: NotificationRow) {
    if (row.readAt) return
    await markNotificationRead(row.id)
    setRows((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, readAt: new Date().toISOString() } : item)),
    )
    await refresh()
  }

  if (!open) {
    return <div id="notification-panel-root" hidden />
  }

  const groups = groupNotifications(rows)

  const body = (
    <div className="flex max-h-[min(70vh,32rem)] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="notification-panel-title" className="text-base font-semibold text-ink">
          Notifications
          {unreadCount > 0 ? (
            <span className="ml-2 text-sm font-medium text-muted">({unreadCount} unread)</span>
          ) : null}
        </h2>
        <Link to="/notifications" onClick={onClose} className={`text-sm font-semibold text-coral ${focusRing}`}>
          See all
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-2">
        <button
          type="button"
          disabled={busy || unreadCount === 0}
          onClick={() => void onMarkAll()}
          className={`min-h-9 rounded-xl px-3 text-sm font-medium text-ink disabled:opacity-50 ${focusRing}`}
        >
          Mark all read
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onClearRead()}
          className={`min-h-9 rounded-xl px-3 text-sm font-medium text-ink disabled:opacity-50 ${focusRing}`}
        >
          Clear read
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {error ? (
          <p role="alert" className="px-2 py-3 text-sm text-coral">
            {error}
          </p>
        ) : null}
        {loading && rows.length === 0 ? <p className="px-2 py-3 text-sm text-muted">Loading…</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState title="All caught up" message="New activity will show up here." />
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-labelledby={`panel-group-${group.key}`} className="mb-3">
              <h3 id={`panel-group-${group.key}`} className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.rows.map((row) => (
                  <li key={row.id}>
                    <NotificationRowView row={row} onNavigate={() => void onRowNavigate(row)} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {nextCursor ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(nextCursor, true)}
            className={`mx-2 mt-2 min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
          >
            Load more
          </button>
        ) : null}
      </div>
    </div>
  )

  if (mobileSheet) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        returnFocusRef={anchorRef as React.RefObject<HTMLElement>}
        labelledBy="notification-panel-title"
        className="w-full max-w-lg rounded-t-3xl border border-line bg-surface shadow-xl"
        containerClassName="fixed inset-0 z-50 flex items-end justify-center"
      >
        <div id="notification-panel-root">{body}</div>
      </Modal>
    )
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="notification-panel-title"
      data-testid="notification-panel"
      id="notification-panel-root"
      style={
        anchorBox
          ? { position: 'fixed', top: anchorBox.top, left: anchorBox.left, zIndex: 60 }
          : { position: 'fixed', top: 72, right: 16, zIndex: 60 }
      }
      className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
    >
      {body}
    </div>
  )
}
