import { useRef } from 'react'
import { BellIcon } from '../icons/BellIcon.tsx'
import { focusRing } from '../shell/navItems.ts'
import { useMediaQuery } from '../../lib/shell/useMediaQuery.ts'
import { useNotifications } from '../../lib/notifications/useNotifications.ts'

type NotificationBellProps = {
  className?: string
  variant?: 'mobile' | 'rail'
}

function badgeLabel(count: number): string {
  if (count <= 0) return ''
  if (count > 99) return '99+'
  return String(count)
}

export function NotificationBell({ className = '', variant = 'rail' }: NotificationBellProps) {
  const { unreadCount, panelOpen, setPanelOpen, registerPanelAnchor } = useNotifications()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const open = panelOpen
  const railLabelVisible = useMediaQuery('(min-width: 1280px)')
  const iconOnlyName =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'

  return (
    <div className={`relative ${className}`} data-testid="notification-bell-wrap">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notification-panel-root"
        aria-label={variant === 'rail' && railLabelVisible ? undefined : iconOnlyName}
        data-testid={variant === 'mobile' ? 'notification-bell-mobile' : 'notification-bell-rail'}
        onClick={() => {
          registerPanelAnchor(buttonRef.current)
          setPanelOpen(!open)
        }}
        className={`relative inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-2xl text-ink ${variant === 'rail' ? 'xl:w-full xl:justify-start xl:px-3' : ''} ${focusRing}`}
      >
        <BellIcon className="size-6 shrink-0" filled={open} />
        {variant === 'rail' ? <span className="hidden xl:ml-3 xl:inline xl:text-base xl:font-medium">Notifications</span> : null}
        {unreadCount > 0 ? (
          <span
            className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-coral bg-surface px-1 text-[11px] font-bold leading-none text-coral"
            data-testid={variant === 'mobile' ? 'notification-badge-mobile' : 'notification-badge-rail'}
          >
            {badgeLabel(unreadCount)}
          </span>
        ) : null}
      </button>
    </div>
  )
}
