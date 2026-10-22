import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth/auth-context.ts'
import { useCreateSheet } from '../../lib/shell/useCreateSheet.ts'
import { focusRing, railNavItems } from './navItems.ts'
import { MoreMenu } from './MoreMenu.tsx'
import { NotificationBell } from '../notifications/NotificationBell.tsx'

function NavTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-sm font-medium text-ink shadow-md max-xl:group-focus-within:block max-xl:group-supports-hover:block xl:hidden">
      {label}
    </span>
  )
}

export function NavRail() {
  const { profile } = useAuth()
  const { openCreateSheet } = useCreateSheet()
  const location = useLocation()
  const username = profile?.username ?? ''
  const navItems = railNavItems(username)

  return (
    <nav
      aria-label="Primary"
      data-testid="nav-rail"
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-width)] flex-col border-r border-line bg-surface py-6 md:flex md:w-[72px] md:items-center md:px-2 xl:w-[244px] xl:items-stretch xl:px-4"
    >
      <Link
        to="/"
        className={`group relative inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-ink xl:w-full xl:justify-start xl:px-2 ${focusRing}`}
      >
        <span className="font-serif text-3xl xl:hidden" aria-hidden="true">
          V
        </span>
        <span className="hidden font-serif text-3xl xl:inline">Voxly</span>
        <span className="sr-only">Voxly home</span>
        <NavTooltip label="Voxly" />
      </Link>
      <ul className="mt-8 flex w-full flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          if (item.create) {
            const active = location.pathname.startsWith('/create')
            return (
              <li key={item.to} className="w-full">
                <button
                  type="button"
                  aria-label="Create"
                  onClick={(event) => openCreateSheet(event.currentTarget)}
                  className={`group relative flex min-h-11 w-full justify-center rounded-2xl xl:justify-start xl:px-3 ${active ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''} ${focusRing}`}
                >
                  <span className="inline-flex size-11 items-center justify-center gap-3 rounded-2xl bg-coral font-semibold text-white xl:w-auto xl:px-3">
                    <Icon filled={active} className="size-6 shrink-0" />
                    <span className="hidden xl:inline xl:text-base">Create</span>
                  </span>
                  <NavTooltip label="Create" />
                </button>
              </li>
            )
          }
          return (
            <li key={item.to} className="w-full">
              <NavLink
                to={item.to}
                end={item.end}
                aria-label={item.label}
                className={({ isActive }) =>
                  `group relative flex min-h-11 w-full items-center justify-center rounded-2xl xl:justify-start xl:px-3 ${isActive ? 'bg-raised font-semibold text-coral' : 'font-medium text-muted'} ${focusRing}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="inline-flex size-11 shrink-0 items-center justify-center gap-3 xl:w-auto xl:justify-start">
                      <Icon filled={isActive} className="size-6 shrink-0" />
                      <span className={`hidden xl:inline xl:text-base ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    </span>
                    <NavTooltip label={item.label} />
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
        <li className="relative hidden w-full md:block">
          <NotificationBell variant="rail" className="w-full" />
        </li>
        <li className="mt-auto w-full pt-2">
          <MoreMenu username={username} />
        </li>
      </ul>
    </nav>
  )
}
