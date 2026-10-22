import { useCallback, useEffect, useState } from 'react'
import { PageContainer } from '../components/shell/PageContainer.tsx'
import { PageHeader } from '../components/shell/PageHeader.tsx'
import { focusRing } from '../components/shell/navItems.ts'
import { EmptyState } from '../components/states/EmptyState.tsx'
import { NotificationRow } from '../components/notifications/NotificationRow.tsx'
import { useAuth } from '../lib/auth/auth-context.ts'
import {
  clearReadNotifications,
  fetchAdminNotificationFeed,
  fetchNotificationFeed,
  markAllNotificationsRead,
  markAdminNotificationRead,
  markNotificationRead,
} from '../lib/notifications/api.ts'
import { groupNotifications } from '../lib/notifications/groupNotifications.ts'
import { useNotifications } from '../lib/notifications/useNotifications.ts'
import type { AdminNotificationRow, NotificationCursor, NotificationRow as Row } from '../lib/notifications/types.ts'
import { useDocumentTitle } from '../lib/useDocumentTitle.ts'

export default function NotificationsPage() {
  useDocumentTitle('Notifications')
  const { isFounder } = useAuth()
  const { refresh, unreadCount } = useNotifications()
  const [rows, setRows] = useState<Row[]>([])
  const [adminRows, setAdminRows] = useState<AdminNotificationRow[]>([])
  const [nextCursor, setNextCursor] = useState<NotificationCursor | null>(null)
  const [adminNext, setAdminNext] = useState<NotificationCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (cursor: NotificationCursor | null, append: boolean) => {
    setLoading(true)
    const result = await fetchNotificationFeed(cursor)
    setLoading(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRows((prev) => (append ? [...prev, ...result.data.rows] : result.data.rows))
    setNextCursor(result.data.nextCursor)
  }, [])

  useEffect(() => {
    void load(null, false)
    if (isFounder) {
      void fetchAdminNotificationFeed(null).then((result) => {
        if (result.ok) {
          setAdminRows(result.data.rows)
          setAdminNext(result.data.nextCursor)
        }
      })
    }
  }, [isFounder, load])

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

  async function onNavigate(row: Row) {
    if (!row.readAt) {
      await markNotificationRead(row.id)
      setRows((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, readAt: new Date().toISOString() } : item)),
      )
      await refresh()
    }
  }

  async function onAdminNavigate(row: AdminNotificationRow) {
    if (!row.readAt) {
      await markAdminNotificationRead(row.id)
      setAdminRows((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, readAt: new Date().toISOString() } : item)),
      )
    }
  }

  const groups = groupNotifications(rows)

  return (
    <PageContainer variant="wide" className="flex flex-col gap-6 py-8">
      <PageHeader title="Notifications" />
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        <button
          type="button"
          disabled={busy || unreadCount === 0}
          onClick={() => void onMarkAll()}
          className={`min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        >
          Mark all read
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onClearRead()}
          className={`min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        >
          Clear read
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
      ) : null}
      {loading && rows.length === 0 ? <p className="text-sm text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState title="No notifications yet" message="When someone interacts with your work, it appears here." />
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-labelledby={`notif-group-${group.key}`}>
            <h2 id={`notif-group-${group.key}`} className="text-xs font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
              {group.rows.map((row) => (
                <li key={row.id}>
                  <NotificationRow row={row} onNavigate={() => void onNavigate(row)} />
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
          className={`min-h-11 self-start rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
        >
          Load more
        </button>
      ) : null}

      {isFounder ? (
        <section className="rounded-2xl border border-line bg-surface p-5" data-testid="founder-admin-notifications">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Founder alerts</h2>
          {adminRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No admin alerts.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {adminRows.map((row) => (
                <li key={row.id}>
                  <NotificationRow variant="admin" row={row} onNavigate={() => void onAdminNavigate(row)} />
                </li>
              ))}
            </ul>
          )}
          {adminNext ? (
            <button
              type="button"
              className={`mt-3 min-h-11 rounded-2xl border border-line px-4 text-sm font-semibold ${focusRing}`}
              onClick={() =>
                void fetchAdminNotificationFeed(adminNext).then((result) => {
                  if (!result.ok) return
                  setAdminRows((prev) => [...prev, ...result.data.rows])
                  setAdminNext(result.data.nextCursor)
                })
              }
            >
              Load more admin alerts
            </button>
          ) : null}
        </section>
      ) : null}
    </PageContainer>
  )
}
