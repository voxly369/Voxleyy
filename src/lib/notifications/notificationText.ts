import type { AdminNotificationRow, NotificationRow } from './types.ts'

function actorLabel(row: { actor: { displayName: string | null; username: string | null } }): string {
  const name = row.actor.displayName?.trim()
  if (name) return name
  if (row.actor.username) return `@${row.actor.username}`
  return 'Someone'
}

function excerpt(title: string | null, fallback: string | null): string {
  const value = title?.trim() || fallback?.trim()
  if (!value) return ''
  return value.length > 80 ? `${value.slice(0, 77)}…` : value
}

function moderationKindText(kind: unknown): string {
  switch (kind) {
    case 'suspended':
      return 'Your account was suspended'
    case 'banned':
      return 'Your account was banned'
    case 'unbanned':
      return 'Your account was restored'
    case 'removed':
      return 'Your content was removed'
    case 'restored':
      return 'Your content was restored'
    default:
      return 'Moderation update'
  }
}

export function buildDisplayText(row: NotificationRow): string {
  const who = actorLabel(row)
  const target = excerpt(row.targetTitle, row.targetExcerpt)
  const data = row.data

  switch (row.type) {
    case 'follow':
      return `${who} followed you`
    case 'like':
      return target ? `${who} liked “${target}”` : `${who} liked your post`
    case 'comment':
      return target ? `${who} commented on “${target}”` : `${who} commented on your post`
    case 'reply':
      return `${who} replied to your comment`
    case 'mention':
      return target ? `${who} mentioned you in “${target}”` : `${who} mentioned you`
    case 'message':
      return `${who} sent you a message`
    case 'collab_invite':
      return `${who} invited you to collaborate`
    case 'community_post':
      return target ? `New community post: “${target}”` : 'New community post'
    case 'new_chapter': {
      const chapterTitle =
        typeof data.chapter_title === 'string' && data.chapter_title.trim()
          ? data.chapter_title.trim()
          : target || 'New chapter'
      return `${who} published “${chapterTitle}”`
    }
    case 'purchase':
      return `${who} purchased your work`
    case 'challenge_start':
      return 'A writing challenge you joined is starting'
    case 'announcement':
      return typeof data.title === 'string' && data.title.trim()
        ? data.title.trim()
        : 'New announcement from Voxly'
    case 'warning':
      return typeof data.message === 'string' && data.message.trim()
        ? `Warning: ${data.message.trim()}`
        : `${who} sent you a warning`
    case 'moderation_notice':
      return moderationKindText(data.kind)
    case 'appeal_decision': {
      const decision = typeof data.decision === 'string' ? data.decision : 'decided'
      return `Your appeal was ${decision}`
    }
    case 'summary': {
      const count = typeof data.count === 'number' ? data.count : row.data.pending ?? 'some'
      return `While you were in quiet mode, you received ${count} notifications`
    }
    case 'badge_awarded': {
      const badge =
        typeof data.badge_name === 'string' && data.badge_name.trim()
          ? data.badge_name.trim()
          : typeof data.badge_key === 'string'
            ? data.badge_key.replace(/_/g, ' ')
            : 'a badge'
      return `You earned the ${badge} badge`
    }
    default:
      return 'New notification'
  }
}

export function buildAdminDisplayText(row: AdminNotificationRow): string {
  const who = actorLabel(row)
  switch (row.type) {
    case 'new_report':
      return `${who} submitted a new report`
    case 'payout_issue':
      return 'Payout issue needs attention'
    case 'milestone':
      return typeof row.data.label === 'string' ? row.data.label : 'Platform milestone reached'
    default:
      return 'Admin alert'
  }
}
