import { supabase } from '../supabaseClient.ts'
import { providerFields } from '../supabaseFailure.ts'
import { parseNotificationSettingsPatch, type NotificationSettingsPatch } from './settingsSchema.ts'
import type {
  AdminNotificationFeedPage,
  AdminNotificationRow,
  NotificationCursor,
  NotificationFailure,
  NotificationFeedPage,
  NotificationResult,
  NotificationRow,
  NotificationSettings,
  NotificationType,
} from './types.ts'
import { NOTIFICATION_PAGE_SIZE } from './types.ts'

const ISOish =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/
const UUIDish = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FEED_COLUMNS =
  'id, type, actor_id, target_type, target_id, data, held, created_at, read_at, actor_username, actor_display_name, actor_avatar_url, actor_verified, target_title, target_excerpt'

const ADMIN_FEED_COLUMNS =
  'id, type, actor_id, target_type, target_id, data, created_at, read_at, actor_username, actor_display_name, actor_avatar_url'

function fail(
  code: NotificationFailure['error']['code'],
  message: string,
  error?: { code?: string; status?: number },
): NotificationFailure {
  return { ok: false, error: { code, message, ...providerFields(error) } }
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function bool(value: unknown): boolean {
  return value === true
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function isNotificationCursor(value: unknown): value is NotificationCursor {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.createdAt === 'string' &&
    ISOish.test(row.createdAt) &&
    typeof row.id === 'string' &&
    UUIDish.test(row.id)
  )
}

export function notificationCursorFilter(cursor: NotificationCursor | null): string | null {
  if (!cursor) return null
  const at = cursor.createdAt.replace(/"/g, '\\"')
  const id = cursor.id.replace(/"/g, '\\"')
  return `created_at.lt."${at}",and(created_at.eq."${at}",id.lt."${id}")`
}

function parseActor(row: Record<string, unknown>) {
  return {
    id: text(row.actor_id),
    username: text(row.actor_username),
    displayName: text(row.actor_display_name),
    avatarUrl: text(row.actor_avatar_url),
    verified: bool(row.actor_verified),
  }
}

function parseNotificationRow(value: unknown): NotificationRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const type = text(row.type)
  const createdAt = text(row.created_at)
  if (!id || !type || !createdAt) return null
  return {
    id,
    type: type as NotificationType,
    actor: parseActor(row),
    targetType: text(row.target_type),
    targetId: text(row.target_id),
    data: record(row.data),
    held: bool(row.held),
    createdAt,
    readAt: text(row.read_at),
    targetTitle: text(row.target_title),
    targetExcerpt: text(row.target_excerpt),
  }
}

function parseAdminRow(value: unknown): AdminNotificationRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = text(row.id)
  const type = text(row.type)
  const createdAt = text(row.created_at)
  if (!id || !type || !createdAt) return null
  return {
    id,
    type: type as AdminNotificationRow['type'],
    actor: parseActor(row),
    targetType: text(row.target_type),
    targetId: text(row.target_id),
    data: record(row.data),
    createdAt,
    readAt: text(row.read_at),
  }
}

function parseSettingsRow(value: unknown): NotificationSettings | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const userId = text(row.user_id)
  const updatedAt = text(row.updated_at)
  if (!userId || !updatedAt) return null
  const reach = text(row.quiet_reach)
  return {
    userId,
    notifyLikes: row.notify_likes !== false,
    notifyComments: row.notify_comments !== false,
    notifyFollows: row.notify_follows !== false,
    notifyMentions: row.notify_mentions !== false,
    notifyMessages: row.notify_messages !== false,
    notifySales: row.notify_sales !== false,
    notifyChapters: row.notify_chapters !== false,
    notifyAnnouncements: row.notify_announcements !== false,
    quietEnabled: row.quiet_enabled === true,
    quietManual: row.quiet_manual === true,
    quietScheduleStart: text(row.quiet_schedule_start),
    quietScheduleEnd: text(row.quiet_schedule_end),
    quietReach:
      reach === 'close_contacts' || reach === 'pen_pals' || reach === 'nobody' ? reach : 'everyone',
    timezone: text(row.timezone) ?? 'UTC',
    showLocalTime: row.show_local_time === true,
    digestEnabled: row.digest_enabled === true,
    digestTime: text(row.digest_time),
    updatedAt,
  }
}

export async function fetchNotificationFeed(
  cursor: NotificationCursor | null,
): Promise<NotificationResult<NotificationFeedPage>> {
  let query = supabase
    .from('notification_feed')
    .select(FEED_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(NOTIFICATION_PAGE_SIZE + 1)

  const filter = notificationCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) return fail('unavailable', 'We could not load notifications. Try again.', error)

  const parsed = (data ?? []).flatMap((row) => {
    const item = parseNotificationRow(row)
    return item ? [item] : []
  })

  const hasMore = parsed.length > NOTIFICATION_PAGE_SIZE
  const rows = hasMore ? parsed.slice(0, NOTIFICATION_PAGE_SIZE) : parsed
  const cursorNext = hasMore && rows.length > 0 ? { createdAt: rows[rows.length - 1]!.createdAt, id: rows[rows.length - 1]!.id } : null
  return { ok: true, data: { rows, nextCursor: cursorNext } }
}

export async function fetchAdminNotificationFeed(
  cursor: NotificationCursor | null,
): Promise<NotificationResult<AdminNotificationFeedPage>> {
  let query = supabase
    .from('admin_notification_feed')
    .select(ADMIN_FEED_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(NOTIFICATION_PAGE_SIZE + 1)

  const filter = notificationCursorFilter(cursor)
  if (filter) query = query.or(filter)

  const { data, error } = await query
  if (error) return fail('unavailable', 'We could not load admin alerts. Try again.', error)

  const parsed = (data ?? []).flatMap((row) => {
    const item = parseAdminRow(row)
    return item ? [item] : []
  })
  const hasMore = parsed.length > NOTIFICATION_PAGE_SIZE
  const rows = hasMore ? parsed.slice(0, NOTIFICATION_PAGE_SIZE) : parsed
  const cursorNext = hasMore && rows.length > 0 ? { createdAt: rows[rows.length - 1]!.createdAt, id: rows[rows.length - 1]!.id } : null
  return { ok: true, data: { rows, nextCursor: cursorNext } }
}

export async function fetchUnreadCount(): Promise<NotificationResult<number>> {
  const { data, error } = await supabase.rpc('notification_unread_count')
  if (error) return fail('unavailable', 'We could not refresh notifications. Try again.', error)
  const count = typeof data === 'number' ? data : Number(data)
  return { ok: true, data: Number.isFinite(count) ? count : 0 }
}

export async function markNotificationRead(id: string): Promise<NotificationResult<null>> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) return fail('unavailable', 'We could not mark this notification read.', error)
  return { ok: true, data: null }
}

export async function markAdminNotificationRead(id: string): Promise<NotificationResult<null>> {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
  if (error) return fail('unavailable', 'We could not mark this alert read.', error)
  return { ok: true, data: null }
}

export async function markAllNotificationsRead(): Promise<NotificationResult<null>> {
  const { error } = await supabase.rpc('mark_all_notifications_read')
  if (error) return fail('unavailable', 'We could not mark all notifications read.', error)
  return { ok: true, data: null }
}

export async function clearReadNotifications(): Promise<NotificationResult<number>> {
  const { data, error } = await supabase.rpc('clear_read_notifications')
  if (error) return fail('unavailable', 'We could not clear read notifications.', error)
  const count = typeof data === 'number' ? data : Number(data)
  return { ok: true, data: Number.isFinite(count) ? count : 0 }
}

export async function fetchNotificationSettings(): Promise<NotificationResult<NotificationSettings>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return fail('forbidden', 'Sign in to manage notification settings.')

  const { data, error } = await supabase.from('notification_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) return fail('unavailable', 'We could not load notification settings.', error)
  const parsed = parseSettingsRow(data)
  if (!parsed) return fail('unavailable', 'Notification settings are missing.')
  return { ok: true, data: parsed }
}

export async function updateNotificationSettings(
  patch: NotificationSettingsPatch,
): Promise<NotificationResult<NotificationSettings>> {
  const validated = parseNotificationSettingsPatch(patch)
  if (!validated) return fail('invalid', 'Those settings are not valid.')

  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return fail('forbidden', 'Sign in to manage notification settings.')

  const payload = { ...validated, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('notification_settings')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error) return fail('unavailable', 'We could not save notification settings.', error)

  if (validated.show_local_time !== undefined || validated.timezone !== undefined) {
    await supabase
      .from('profiles')
      .update({
        ...(validated.show_local_time !== undefined ? { show_local_time: validated.show_local_time } : {}),
        ...(validated.timezone !== undefined ? { timezone: validated.timezone } : {}),
      })
      .eq('id', userId)
  }

  const parsed = parseSettingsRow(data)
  if (!parsed) return fail('unavailable', 'Saved settings could not be read back.')
  return { ok: true, data: parsed }
}

const timezonePattern = /^[A-Za-z0-9_+\-/]{1,64}$/

export function detectBrowserTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz || !timezonePattern.test(tz)) return null
    return tz
  } catch {
    return null
  }
}

/** When settings still use UTC default, persist the browser IANA zone once. */
export async function syncDetectedTimezoneIfDefault(): Promise<void> {
  const detected = detectBrowserTimezone()
  if (!detected || detected === 'UTC') return

  const current = await fetchNotificationSettings()
  if (!current.ok) return
  if (current.data.timezone !== 'UTC') return

  await updateNotificationSettings({ timezone: detected })
}
