import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { useCreateSheet } from '../../lib/shell/useCreateSheet.ts'
import { bottomNavItems, focusRing } from './navItems.ts'
import { useMessagesUnreadBadge } from '../../lib/messages/useMessages.ts'
import { messagesBadgeLabel } from '../messages/MessagesNavBadge.tsx'

export function BottomNav() {
  const { profile } = useAuth()
  const { openCreateSheet } = useCreateSheet()
  const location = useLocation()
  const navItems = bottomNavItems(profile?.username ?? '')
  const messagesUnread = useMessagesUnreadBadge()

  return (
    <nav
      aria-label="Primary"
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon
          if (item.create) {
            const active = location.pathname.startsWith('/create')
            return (
              <li key={item.to} className="flex items-end justify-center">
                <button
                  type="button"
                  aria-label="Create"
                  onClick={(event) => openCreateSheet(event.currentTarget)}
                  className={`relative -top-3 flex size-14 items-center justify-center rounded-full bg-coral text-white font-semibold ${active ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''} ${focusRing}`}
                >
                  <Icon filled={active} />
                  <span className="sr-only">{item.label}</span>
                </button>
              </li>
            )
          }
          const showMessagesBadge = item.to === '/messages' && messagesUnread > 0
          return (
            <li key={item.to} className="flex items-end justify-center">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.65rem] leading-none ${isActive ? 'font-semibold text-coral' : 'font-medium text-muted'} ${focusRing}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon filled={isActive} />
                    <span>{item.label}</span>
                    {showMessagesBadge ? (
                      <span
                        className="absolute right-2 top-0 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold leading-4 text-white"
                        data-testid="messages-badge-mobile"
                      >
                        {messagesBadgeLabel(messagesUnread)}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
