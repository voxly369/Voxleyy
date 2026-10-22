/**
 * Playwright-only Supabase REST mocks for notification flows (Prompt 13A).
 * Never import this module from src/.
 */
import type { Route } from '@playwright/test'
import { OTHER, READER } from './fixtures.ts'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

const CREATION_ID = '00000000-0000-0000-0000-000000000001'

type NotificationRecord = Record<string, unknown>
type SettingsRecord = Record<string, unknown>

let notifications: NotificationRecord[] = []
let adminNotifications: NotificationRecord[] = []
let settings: SettingsRecord
let unreadOverride: number | null = null
let quietManual = false
let toastEvents: string[] = []

function defaultSettings(): SettingsRecord {
  return {
    user_id: READER.id,
    notify_likes: true,
    notify_comments: true,
    notify_follows: true,
    notify_mentions: true,
    notify_messages: true,
    notify_sales: true,
    notify_chapters: true,
    notify_announcements: true,
    quiet_enabled: false,
    quiet_manual: false,
    quiet_schedule_start: null,
    quiet_schedule_end: null,
    quiet_reach: 'everyone',
    timezone: 'UTC',
    show_local_time: false,
    digest_enabled: false,
    digest_time: null,
    quiet_summary_pending: 0,
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function seedNotifications() {
  notifications = [
    {
      id: '00000000-0000-0000-0000-000000000n01',
      recipient_id: READER.id,
      type: 'like',
      actor_id: OTHER.id,
      target_type: 'creation',
      target_id: CREATION_ID,
      data: {},
      held: false,
      created_at: new Date().toISOString(),
      read_at: null,
      actor_username: OTHER.username,
      actor_display_name: OTHER.display_name,
      actor_avatar_url: null,
      target_title: 'Readable creation',
      target_excerpt: 'Long reading sample',
    },
    {
      id: '00000000-0000-0000-0000-000000000n02',
      recipient_id: READER.id,
      type: 'mention',
      actor_id: OTHER.id,
      target_type: 'creation',
      target_id: CREATION_ID,
      data: { comment_id: 'c0000000-0000-0000-0000-000000000001' },
      held: false,
      created_at: '2026-01-01T12:00:00.000Z',
      read_at: '2026-01-01T13:00:00.000Z',
      actor_username: OTHER.username,
      actor_display_name: OTHER.display_name,
      actor_avatar_url: null,
      target_title: 'Readable creation',
      target_excerpt: 'Mention excerpt',
    },
    ...Array.from({ length: 22 }, (_, i) => ({
      id: `00000000-0000-0000-0000-${String(i + 3).padStart(12, '0')}n`,
      recipient_id: READER.id,
      type: 'follow',
      actor_id: OTHER.id,
      target_type: 'profile',
      target_id: OTHER.id,
      data: {},
      held: false,
      created_at: new Date(Date.UTC(2025, 11, 30 - i)).toISOString(),
      read_at: null,
      actor_username: OTHER.username,
      actor_display_name: OTHER.display_name,
      actor_avatar_url: null,
      target_title: null,
      target_excerpt: null,
    })),
  ]
  adminNotifications = [
    {
      id: '00000000-0000-0000-0000-000000000a01',
      recipient_id: READER.id,
      type: 'new_report',
      actor_id: OTHER.id,
      target_type: 'creation',
      target_id: CREATION_ID,
      data: { report_id: '00000000-0000-0000-0000-000000000099' },
      created_at: '2026-01-02T00:00:00.000Z',
      read_at: null,
      actor_username: OTHER.username,
      actor_display_name: OTHER.display_name,
      actor_avatar_url: null,
    },
  ]
}

export function resetNotificationMocks() {
  settings = defaultSettings()
  quietManual = false
  unreadOverride = null
  toastEvents = []
  seedNotifications()
}

export function setNotificationQuietManual(value: boolean) {
  quietManual = value
  settings = { ...settings, quiet_manual: value }
  if (!value && Number(settings.quiet_summary_pending) > 0) {
    const pending = Number(settings.quiet_summary_pending)
    settings = { ...settings, quiet_summary_pending: 0 }
    notifications.unshift({
      id: '00000000-0000-0000-0000-000000000sum1',
      recipient_id: READER.id,
      type: 'summary',
      actor_id: null,
      target_type: null,
      target_id: null,
      data: { kind: 'quiet_end', count: pending },
      held: false,
      created_at: new Date().toISOString(),
      read_at: null,
      actor_username: null,
      actor_display_name: null,
      actor_avatar_url: null,
      target_title: null,
      target_excerpt: null,
    })
  }
}

export function setNotificationQuietReach(value: string) {
  settings = { ...settings, quiet_reach: value }
}

export function seedHeldNotification() {
  settings = {
    ...settings,
    quiet_summary_pending: Number(settings.quiet_summary_pending ?? 0) + 1,
  }
  notifications.unshift({
    id: '00000000-0000-0000-0000-000000000held',
    recipient_id: READER.id,
    type: 'like',
    actor_id: OTHER.id,
    target_type: 'creation',
    target_id: CREATION_ID,
    data: {},
    held: true,
    created_at: new Date().toISOString(),
    read_at: null,
    actor_username: OTHER.username,
    actor_display_name: OTHER.display_name,
    actor_avatar_url: null,
    target_title: 'Readable creation',
    target_excerpt: 'Held while quiet',
  })
}

export function setNotificationUnreadOverride(count: number | null) {
  unreadOverride = count
}

export function bumpNotificationUnread() {
  const unread = notifications.filter((n) => !n.read_at).length + 1
  unreadOverride = unread
  notifications.unshift({
    id: `00000000-0000-0000-0000-${String(Date.now()).slice(-12)}n`,
    recipient_id: READER.id,
    type: 'comment',
    actor_id: OTHER.id,
    target_type: 'creation',
    target_id: CREATION_ID,
    data: {},
    held: false,
    created_at: new Date().toISOString(),
    read_at: null,
    actor_username: OTHER.username,
    actor_display_name: OTHER.display_name,
    actor_avatar_url: null,
    target_title: 'Readable creation',
    target_excerpt: 'New comment',
  })
}

export function notificationToastEvents(): string[] {
  return toastEvents
}

function unreadCount(): number {
  if (unreadOverride !== null) return unreadOverride
  return notifications.filter((n) => !n.read_at && n.held !== true).length
}

function parseLimit(url: string): number {
  const match = url.match(/limit=(\d+)/)
  return match ? Number(match[1]) : 20
}

function sortDesc(rows: NotificationRecord[]): NotificationRecord[] {
  return [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

function feedPage(url: string, rows: NotificationRecord[]): NotificationRecord[] {
  const limit = parseLimit(url)
  const sorted = sortDesc(rows)
  return sorted.slice(0, limit)
}

function rpcBody(postData: unknown): Record<string, unknown> {
  if (!postData || typeof postData !== 'object') return {}
  return postData as Record<string, unknown>
}

export function notificationMockHandleRest(url: string, method: string, postData: unknown): Json | undefined {
  if (!url.includes('/rest/v1/')) return undefined

  if (url.includes('/rest/v1/rpc/notification_unread_count')) {
    return unreadCount()
  }
  if (url.includes('/rest/v1/rpc/prepare_notification_delivery')) {
    return null
  }
  if (url.includes('/rest/v1/rpc/mark_all_notifications_read')) {
    notifications = notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    unreadOverride = 0
    return null
  }
  if (url.includes('/rest/v1/rpc/clear_read_notifications')) {
    const before = notifications.length
    notifications = notifications.filter((n) => !n.read_at)
    return before - notifications.length
  }

  if (url.includes('/rest/v1/notification_feed')) {
    let rows = sortDesc(notifications)
    const limit = parseLimit(url)
    if (url.includes('created_at.lt')) {
      const cursorMatch = url.match(/created_at\.lt\.([^,&]+)/)
      const idMatch = url.match(/id\.lt\.([^)&]+)/)
      const cursorAt = cursorMatch?.[1]?.replace(/"/g, '')
      const cursorId = idMatch?.[1]?.replace(/"/g, '')
      if (cursorAt && cursorId) {
        rows = rows.filter((n) => {
          const at = String(n.created_at)
          if (at < cursorAt) return true
          if (at > cursorAt) return false
          return String(n.id) < cursorId
        })
      } else if (cursorAt) {
        rows = rows.filter((n) => String(n.created_at) < cursorAt)
      }
    }
    return rows.slice(0, limit)
  }

  if (url.includes('/rest/v1/admin_notification_feed')) {
    return feedPage(url, adminNotifications)
  }

  if (url.includes('/rest/v1/notification_settings')) {
    if (method === 'GET' || method === 'PATCH' || method === 'POST') {
      if ((method === 'PATCH' || method === 'POST') && postData) {
        settings = { ...settings, ...(postData as Record<string, unknown>), updated_at: new Date().toISOString() }
      }
      return [settings]
    }
  }

  if (url.includes('/rest/v1/profiles') && method === 'PATCH') {
    return []
  }

  if (url.includes('/rest/v1/notifications') && method === 'PATCH') {
    const body = rpcBody(postData)
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const id = idMatch?.[1]
    if (id) {
      notifications = notifications.map((n) =>
        n.id === id ? { ...n, read_at: body.read_at ?? new Date().toISOString() } : n,
      )
      unreadOverride = unreadCount()
    }
    return []
  }

  if (url.includes('/rest/v1/admin_notifications') && method === 'PATCH') {
    const idMatch = url.match(/id=eq\.([^&]+)/)
    const id = idMatch?.[1]
    if (id) {
      adminNotifications = adminNotifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      )
    }
    return []
  }

  if (url.includes('/rest/v1/notifications') && method === 'POST') {
    return { __httpError: { status: 403, message: 'insert blocked' } } as unknown as Json
  }

  if (url.includes('/rest/v1/notifications') && method === 'GET' && !url.includes('notification_feed')) {
    return notifications
  }

  return undefined
}

/** Optional route hook for simulating toast delivery in e2e. */
export function notificationMockOnInsert(type: string) {
  if (quietManual) return
  toastEvents.push(type)
}

export type NotificationMockRoute = Route
