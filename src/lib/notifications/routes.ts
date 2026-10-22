import type { AdminNotificationRow, NotificationRow } from './types.ts'

function creationIdFromData(data: Record<string, unknown>, fallback: string | null): string | null {
  if (typeof data.creation_id === 'string') return data.creation_id
  if (typeof data.book_id === 'string') return data.book_id
  return fallback
}

export function notificationHref(row: NotificationRow): string | null {
  switch (row.type) {
    case 'follow':
    case 'warning':
      if (row.actor.username) return `/u/${row.actor.username}`
      if (row.targetType === 'profile' && row.targetId) return `/u/${row.targetId}`
      return null
    case 'like':
    case 'mention':
    case 'community_post':
      if (row.targetType === 'creation' && row.targetId) return `/c/${row.targetId}`
      return null
    case 'comment':
    case 'reply': {
      const creationId = creationIdFromData(row.data, row.targetType === 'creation' ? row.targetId : null)
      if (creationId) return `/c/${creationId}`
      return null
    }
    case 'new_chapter': {
      const bookId = typeof row.data.book_id === 'string' ? row.data.book_id : null
      if (bookId && row.targetId) return `/read/book/${bookId}/${row.targetId}`
      if (bookId) return `/books/${bookId}`
      return null
    }
    case 'message':
      return '/messages'
    case 'appeal_decision':
      return '/settings/appeals'
    case 'moderation_notice':
      if (row.targetType === 'creation' && row.targetId) return `/c/${row.targetId}`
      return '/settings'
    case 'purchase':
    case 'announcement':
    case 'summary':
    case 'collab_invite':
    case 'challenge_start':
      return null
    default:
      return null
  }
}

export function adminNotificationHref(row: AdminNotificationRow): string | null {
  if (row.type === 'new_report') return '/founder'
  return '/founder'
}
