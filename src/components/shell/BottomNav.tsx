import { NavLink } from 'react-router-dom'
import { focusRing, navItems } from './navItems.ts'

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid h-16 grid-cols-6">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="flex items-end justify-center">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  item.create
                    ? `relative -top-3 flex size-14 items-center justify-center rounded-full bg-coral text-white ${isActive ? 'font-semibold ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'font-semibold'} ${focusRing}`
                    : `flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 px-1 text-[0.65rem] leading-none ${isActive ? 'font-semibold text-coral' : 'font-medium text-muted'} ${focusRing}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon filled={isActive} />
                    <span className={item.create ? 'sr-only' : undefined}>{item.label}</span>
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
