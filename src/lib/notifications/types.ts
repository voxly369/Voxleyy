export const NOTIFICATION_TYPES = [
  'follow',
  'like',
  'comment',
  'reply',
  'mention',
  'message',
  'collab_invite',
  'community_post',
  'new_chapter',
  'purchase',
  'challenge_start',
  'announcement',
  'warning',
  'moderation_notice',
  'appeal_decision',
  'summary',
  'badge_awarded',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const ADMIN_NOTIFICATION_TYPES = ['new_report', 'payout_issue', 'milestone'] as const

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number]

export type QuietReach = 'everyone' | 'close_contacts' | 'pen_pals' | 'nobody'

export type NotificationActor = {
  id: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  verified: boolean
}

export type NotificationRow = {
  id: string
  type: NotificationType
  actor: NotificationActor
  targetType: string | null
  targetId: string | null
  data: Record<string, unknown>
  held: boolean
  createdAt: string
  readAt: string | null
  targetTitle: string | null
  targetExcerpt: string | null
}

export type AdminNotificationRow = {
  id: string
  type: AdminNotificationType
  actor: NotificationActor
  targetType: string | null
  targetId: string | null
  data: Record<string, unknown>
  createdAt: string
  readAt: string | null
}

export type NotificationSettings = {
  userId: string
  notifyLikes: boolean
  notifyComments: boolean
  notifyFollows: boolean
  notifyMentions: boolean
  notifyMessages: boolean
  notifySales: boolean
  notifyChapters: boolean
  notifyAnnouncements: boolean
  quietEnabled: boolean
  quietManual: boolean
  quietScheduleStart: string | null
  quietScheduleEnd: string | null
  quietReach: QuietReach
  timezone: string
  showLocalTime: boolean
  digestEnabled: boolean
  digestTime: string | null
  updatedAt: string
}

export type NotificationCursor = {
  createdAt: string
  id: string
}

export const NOTIFICATION_PAGE_SIZE = 20

export type NotificationFailureCode = 'forbidden' | 'unavailable' | 'invalid'

export type NotificationFailure = {
  ok: false
  error: {
    code: NotificationFailureCode
    message: string
    providerCode?: string
    providerStatus?: number
  }
}

export type NotificationResult<T> = { ok: true; data: T } | NotificationFailure

export type NotificationFeedPage = {
  rows: NotificationRow[]
  nextCursor: NotificationCursor | null
}

export type AdminNotificationFeedPage = {
  rows: AdminNotificationRow[]
  nextCursor: NotificationCursor | null
}
