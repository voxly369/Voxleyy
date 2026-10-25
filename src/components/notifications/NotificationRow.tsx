import { Link } from 'react-router-dom'
import { focusRing } from '../shell/navItems.ts'
import { ImageWithFallback } from '../states/ImageWithFallback.tsx'
import {
  buildAdminDisplayText,
  buildDisplayText,
  buildNotificationActionText,
  notificationShowsActorName,
} from '../../lib/notifications/notificationText.ts'
import { DisplayNameWithMarks } from '../profile/DisplayNameWithMarks.tsx'
import { adminNotificationHref, notificationHref } from '../../lib/notifications/routes.ts'
import type { AdminNotificationRow, NotificationRow as Row } from '../../lib/notifications/types.ts'

type UserProps = {
  variant?: 'user'
  row: Row
  onNavigate?: (row: Row) => void
}

type AdminProps = {
  variant: 'admin'
  row: AdminNotificationRow
  onNavigate?: (row: AdminNotificationRow) => void
}

type Props = UserProps | AdminProps

function relativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationRow(props: Props) {
  const isAdmin = props.variant === 'admin'
  const row = props.row
  const unread = !row.readAt
  const label = isAdmin ? buildAdminDisplayText(props.row) : buildDisplayText((props as UserProps).row)
  const href = isAdmin ? adminNotificationHref(props.row) : notificationHref((props as UserProps).row)
  const actorName = row.actor.displayName || row.actor.username || 'Someone'
  const userRow = !isAdmin ? (props as UserProps).row : null
  const showActorLine = userRow !== null && notificationShowsActorName(userRow)

  const inner = (
    <>
      <ImageWithFallback
        src={row.actor.avatarUrl ?? undefined}
        alt=""
        label={actorName}
        className="!size-11 shrink-0"
      />
      <div className="min-w-0 flex-1">
        {showActorLine ? (
          <p className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm ${unread ? 'font-semibold text-ink' : 'text-ink'}`}>
            <DisplayNameWithMarks name={actorName} verified={userRow!.actor.verified} />
            <span>{buildNotificationActionText(userRow!)}</span>
          </p>
        ) : (
          <p className={`text-sm ${unread ? 'font-semibold text-ink' : 'text-ink'}`}>{label}</p>
        )}
        <p className="text-xs text-muted">{relativeTime(row.createdAt)}</p>
      </div>
      {unread ? <span className="size-2 shrink-0 rounded-full bg-coral" aria-hidden="true" /> : null}
    </>
  )

  const className = `flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ${unread ? 'bg-raised/60' : 'bg-transparent'} ${focusRing}`

  function handleClick() {
    if (isAdmin) {
      ;(props as AdminProps).onNavigate?.(props.row)
    } else {
      ;(props as UserProps).onNavigate?.(props.row)
    }
  }

  if (href) {
    return (
      <Link
        to={href}
        className={className}
        data-testid="notification-row"
        data-notification-id={row.id}
        data-held={!isAdmin && 'held' in row && row.held ? 'true' : 'false'}
        onClick={handleClick}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div
      className={className}
      data-testid="notification-row"
      data-notification-id={row.id}
      data-held={!isAdmin && 'held' in row && row.held ? 'true' : 'false'}
    >
      {inner}
    </div>
  )
}
